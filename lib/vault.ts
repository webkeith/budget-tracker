import {
  ARGON2_PARAMS,
  decodeRecoveryKey,
  decryptBytes,
  deriveKeyFromSecret,
  encodeRecoveryKey,
  encryptBytes,
  hkdfKey,
  importAesKey,
  parseEnvelope,
  randomBytes,
  serializeEnvelope,
  unb64,
  b64,
  type Bytes,
  type KdfParams,
} from "@/lib/crypto";

export interface VaultRecord {
  v: 1;
  kdf: KdfParams["kdf"];
  kdf_params: KdfParams;
  salt_pass: string;
  wrapped_dek_pass: string;
  salt_recovery: string;
  wrapped_dek_recovery: string;
}

export class WrongSecretError extends Error {
  constructor(message = "That doesn't match. Try again.") {
    super(message);
    this.name = "WrongSecretError";
  }
}

const AAD_PASS = "budget:vault:dek:passphrase:v1";
const AAD_RECOVERY = "budget:vault:dek:recovery:v1";
export const MIN_PASSPHRASE = 10;

export function generateDekRaw(): Bytes {
  return randomBytes(32);
}

export function generateRecoveryKey(): { raw: Bytes; text: string } {
  const raw = randomBytes(16);
  return { raw, text: encodeRecoveryKey(raw) };
}

async function wrapWithPassphrase(dekRaw: Bytes, passphrase: string, params: KdfParams = ARGON2_PARAMS) {
  const salt = randomBytes(16);
  const { key, params: used } = await deriveKeyFromSecret(passphrase, salt, params);
  const env = await encryptBytes(key, dekRaw, AAD_PASS);
  return { salt_pass: b64(salt), wrapped_dek_pass: serializeEnvelope(env), params: used };
}

async function wrapWithRecovery(dekRaw: Bytes, recoveryRaw: Bytes) {
  const salt = randomBytes(16);
  const key = await hkdfKey(recoveryRaw, salt, AAD_RECOVERY);
  const env = await encryptBytes(key, dekRaw, AAD_RECOVERY);
  return { salt_recovery: b64(salt), wrapped_dek_recovery: serializeEnvelope(env) };
}

export async function createVault(passphrase: string, dekRaw: Bytes, recoveryRaw: Bytes, params: KdfParams = ARGON2_PARAMS): Promise<VaultRecord> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error(`Use at least ${MIN_PASSPHRASE} characters.`);
  const pass = await wrapWithPassphrase(dekRaw, passphrase, params);
  const rec = await wrapWithRecovery(dekRaw, recoveryRaw);
  return {
    v: 1,
    kdf: pass.params.kdf,
    kdf_params: pass.params,
    salt_pass: pass.salt_pass,
    wrapped_dek_pass: pass.wrapped_dek_pass,
    ...rec,
  };
}

export async function unlockWithPassphrase(vault: VaultRecord, passphrase: string): Promise<Bytes> {
  try {
    const { key } = await deriveKeyFromSecret(passphrase, unb64(vault.salt_pass), vault.kdf_params);
    return await decryptBytes(key, parseEnvelope(vault.wrapped_dek_pass), AAD_PASS);
  } catch {
    throw new WrongSecretError("That passphrase doesn't match. Try again.");
  }
}

export async function unlockWithRecovery(vault: VaultRecord, recoveryText: string): Promise<Bytes> {
  let raw: Bytes;
  try {
    raw = decodeRecoveryKey(recoveryText);
  } catch {
    throw new WrongSecretError("That recovery key doesn't look right. Check for typos.");
  }
  try {
    const key = await hkdfKey(raw, unb64(vault.salt_recovery), AAD_RECOVERY);
    return await decryptBytes(key, parseEnvelope(vault.wrapped_dek_recovery), AAD_RECOVERY);
  } catch {
    throw new WrongSecretError("That recovery key doesn't match this account.");
  } finally {
    raw.fill(0);
  }
}

export async function changePassphrase(vault: VaultRecord, dekRaw: Bytes, newPassphrase: string): Promise<VaultRecord> {
  if (newPassphrase.length < MIN_PASSPHRASE) throw new Error(`Use at least ${MIN_PASSPHRASE} characters.`);
  const pass = await wrapWithPassphrase(dekRaw, newPassphrase, ARGON2_PARAMS);
  return { ...vault, kdf: pass.params.kdf, kdf_params: pass.params, salt_pass: pass.salt_pass, wrapped_dek_pass: pass.wrapped_dek_pass };
}

export async function rotateRecoveryKey(vault: VaultRecord, dekRaw: Bytes): Promise<{ vault: VaultRecord; text: string }> {
  const { raw, text } = generateRecoveryKey();
  const rec = await wrapWithRecovery(dekRaw, raw);
  raw.fill(0);
  return { vault: { ...vault, ...rec }, text };
}

export function dekFromRaw(raw: Bytes): Promise<CryptoKey> {
  return importAesKey(raw, false);
}
