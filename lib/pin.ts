import {
  ARGON2_PARAMS,
  decryptBytes,
  deriveKeyFromSecret,
  encryptBytes,
  generateDeviceKey,
  parseEnvelope,
  randomBytes,
  serializeEnvelope,
  unb64,
  b64,
  type Bytes,
  type KdfParams,
} from "@/lib/crypto";

export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export interface PinWrapper {
  v: 1;
  salt: string;
  params: KdfParams;
  outer: string;
  length: number;
}

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_KEYS = { deviceKey: "deviceKey", pin: "pinWrapper", attempts: "pinAttempts" } as const;
const AAD_INNER = "budget:device:dek:v1";
const AAD_OUTER = "budget:pin:dek:v1";

export function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function getDeviceKey(kv: KV): Promise<CryptoKey> {
  const existing = await kv.get<CryptoKey>(PIN_KEYS.deviceKey);
  if (existing) return existing;
  const key = await generateDeviceKey();
  await kv.set(PIN_KEYS.deviceKey, key);
  return key;
}

export async function wrapForDevice(kv: KV, dekRaw: Bytes): Promise<string> {
  const deviceKey = await getDeviceKey(kv);
  return serializeEnvelope(await encryptBytes(deviceKey, dekRaw, AAD_INNER));
}

export async function unwrapFromDevice(kv: KV, inner: string): Promise<Bytes> {
  const deviceKey = await kv.get<CryptoKey>(PIN_KEYS.deviceKey);
  if (!deviceKey) throw new Error("This device isn't set up yet.");
  return decryptBytes(deviceKey, parseEnvelope(inner), AAD_INNER);
}

export async function setupPin(kv: KV, pin: string, dekRaw: Bytes, params: KdfParams = ARGON2_PARAMS): Promise<void> {
  if (!isValidPin(pin)) throw new Error("Use 4 to 6 digits.");
  const inner = await wrapForDevice(kv, dekRaw);
  const salt = randomBytes(16);
  const { key, params: used } = await deriveKeyFromSecret(pin, salt, params);
  const outer = serializeEnvelope(await encryptBytes(key, new TextEncoder().encode(inner), AAD_OUTER));
  const wrapper: PinWrapper = { v: 1, salt: b64(salt), params: used, outer, length: pin.length };
  await kv.set(PIN_KEYS.pin, wrapper);
  await kv.set(PIN_KEYS.attempts, 0);
}

export async function hasPin(kv: KV): Promise<boolean> {
  return Boolean(await kv.get<PinWrapper>(PIN_KEYS.pin));
}

export async function pinLength(kv: KV): Promise<number> {
  return (await kv.get<PinWrapper>(PIN_KEYS.pin))?.length ?? 6;
}

export async function attemptsLeft(kv: KV): Promise<number> {
  return PIN_MAX_ATTEMPTS - ((await kv.get<number>(PIN_KEYS.attempts)) ?? 0);
}

export type PinResult =
  | { ok: true; dekRaw: Bytes }
  | { ok: false; reason: "wrong"; remaining: number }
  | { ok: false; reason: "locked-out" }
  | { ok: false; reason: "no-pin" };

export async function unlockWithPin(kv: KV, pin: string): Promise<PinResult> {
  const wrapper = await kv.get<PinWrapper>(PIN_KEYS.pin);
  if (!wrapper) return { ok: false, reason: "no-pin" };
  try {
    const { key } = await deriveKeyFromSecret(pin, unb64(wrapper.salt), wrapper.params);
    const innerBytes = await decryptBytes(key, parseEnvelope(wrapper.outer), AAD_OUTER);
    const dekRaw = await unwrapFromDevice(kv, new TextDecoder().decode(innerBytes));
    await kv.set(PIN_KEYS.attempts, 0);
    return { ok: true, dekRaw };
  } catch {
    const used = ((await kv.get<number>(PIN_KEYS.attempts)) ?? 0) + 1;
    if (used >= PIN_MAX_ATTEMPTS) {
      await removePin(kv);
      return { ok: false, reason: "locked-out" };
    }
    await kv.set(PIN_KEYS.attempts, used);
    return { ok: false, reason: "wrong", remaining: PIN_MAX_ATTEMPTS - used };
  }
}

export async function removePin(kv: KV): Promise<void> {
  await kv.del(PIN_KEYS.pin);
  await kv.del(PIN_KEYS.attempts);
}

export function memoryKV(): KV & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get<T>(k: string) {
      return store.get(k) as T | undefined;
    },
    async set(k, v) {
      store.set(k, v);
    },
    async del(k) {
      store.delete(k);
    },
  };
}
