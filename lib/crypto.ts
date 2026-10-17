import { argon2id } from "@/lib/vendor/argon2";

export type Bytes = Uint8Array<ArrayBuffer>;

export interface Envelope {
  v: 1;
  iv: string;
  ct: string;
}

export interface KdfParams {
  kdf: "argon2id" | "pbkdf2-sha256";
  m?: number;
  t?: number;
  p?: number;
  iterations?: number;
}

export const ARGON2_PARAMS: KdfParams = { kdf: "argon2id", m: 19456, t: 2, p: 1 };
export const PBKDF2_PARAMS: KdfParams = { kdf: "pbkdf2-sha256", iterations: 600_000 };

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBytes(input: ArrayBuffer | ArrayBufferView): Bytes {
  if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

export function randomBytes(n: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function b64(bytes: ArrayBuffer | ArrayBufferView): string {
  const u = toBytes(bytes);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export function unb64(s: string): Bytes {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function wipe(bytes?: Uint8Array | null) {
  bytes?.fill(0);
}

export async function deriveRawKey(secret: string, salt: Bytes, params: KdfParams): Promise<Bytes> {
  if (params.kdf === "argon2id") {
    const out = await argon2id({
      password: secret,
      salt,
      parallelism: params.p ?? 1,
      iterations: params.t ?? 2,
      memorySize: params.m ?? 19456,
      hashLength: 32,
      outputType: "binary",
    });
    return toBytes(out);
  }
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: params.iterations ?? 600_000 },
    base,
    256,
  );
  return toBytes(bits);
}

export async function deriveKeyFromSecret(secret: string, salt: Bytes, params: KdfParams): Promise<{ key: CryptoKey; params: KdfParams }> {
  let raw: Bytes;
  let used = params;
  try {
    raw = await deriveRawKey(secret, salt, params);
  } catch (e) {
    if (params.kdf !== "argon2id") throw e;
    used = PBKDF2_PARAMS;
    raw = await deriveRawKey(secret, salt, used);
  }
  const key = await importAesKey(raw);
  wipe(raw);
  return { key, params: used };
}

export async function hkdfKey(ikm: Bytes, salt: Bytes, info: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: enc.encode(info) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function importAesKey(raw: Bytes, extractable = false): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, extractable, ["encrypt", "decrypt"]);
}

export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptBytes(key: CryptoKey, data: Bytes, aad?: string): Promise<Envelope> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    aad ? { name: "AES-GCM", iv, additionalData: enc.encode(aad) } : { name: "AES-GCM", iv },
    key,
    data,
  );
  return { v: 1, iv: b64(iv), ct: b64(ct) };
}

export async function decryptBytes(key: CryptoKey, env: Envelope, aad?: string): Promise<Bytes> {
  const iv = unb64(env.iv);
  const pt = await crypto.subtle.decrypt(
    aad ? { name: "AES-GCM", iv, additionalData: enc.encode(aad) } : { name: "AES-GCM", iv },
    key,
    unb64(env.ct),
  );
  return toBytes(pt);
}

export async function encryptJSON(key: CryptoKey, value: unknown, aad?: string): Promise<Envelope> {
  return encryptBytes(key, enc.encode(JSON.stringify(value)), aad);
}

export async function decryptJSON<T = unknown>(key: CryptoKey, env: Envelope, aad?: string): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(key, env, aad))) as T;
}

export function serializeEnvelope(env: Envelope): string {
  return JSON.stringify(env);
}

export function parseEnvelope(s: string): Envelope {
  const parsed = JSON.parse(s);
  if (!parsed || parsed.v !== 1 || typeof parsed.iv !== "string" || typeof parsed.ct !== "string") {
    throw new Error("Unsupported envelope");
  }
  return parsed as Envelope;
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function encodeRecoveryKey(bytes: Bytes): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out.match(/.{1,4}/g)!.join("-");
}

export function decodeRecoveryKey(text: string): Bytes {
  const clean = text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = CROCKFORD.indexOf(ch);
    if (idx === -1) throw new Error("Invalid recovery key");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  if (out.length < 16) throw new Error("Recovery key is too short");
  return new Uint8Array(out.slice(0, 16));
}

export function passphraseStrength(pass: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pass) return { score: 0, label: "Too short" };
  let pool = 0;
  if (/[a-z]/.test(pass)) pool += 26;
  if (/[A-Z]/.test(pass)) pool += 26;
  if (/[0-9]/.test(pass)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pass)) pool += 33;
  const uniqueRatio = new Set(pass).size / pass.length;
  const entropy = pass.length * Math.log2(Math.max(pool, 1)) * Math.min(1, 0.5 + uniqueRatio);
  if (pass.length < 10) return { score: 0, label: "Too short" };
  if (entropy < 45) return { score: 1, label: "Weak" };
  if (entropy < 60) return { score: 2, label: "Okay" };
  if (entropy < 80) return { score: 3, label: "Strong" };
  return { score: 4, label: "Very strong" };
}
