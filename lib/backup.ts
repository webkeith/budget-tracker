import type { AppData } from "@/types";
import { ARGON2_PARAMS, b64, decryptJSON, deriveKeyFromSecret, encryptJSON, randomBytes, unb64, type Envelope, type KdfParams } from "@/lib/crypto";
import { normalize } from "@/lib/storage";

export interface EncryptedBackup {
  format: "budget-tracker-backup";
  v: 1;
  encrypted: true;
  kdf_params: KdfParams;
  salt: string;
  data: Envelope;
  exportedAt: string;
}

const AAD = "budget:backup:v1";

export async function createEncryptedBackup(data: AppData, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const { key, params } = await deriveKeyFromSecret(passphrase, salt, ARGON2_PARAMS);
  const backup: EncryptedBackup = {
    format: "budget-tracker-backup",
    v: 1,
    encrypted: true,
    kdf_params: params,
    salt: b64(salt),
    data: await encryptJSON(key, data, AAD),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(backup, null, 2);
}

export function isEncryptedBackup(parsed: unknown): parsed is EncryptedBackup {
  return Boolean(parsed && typeof parsed === "object" && (parsed as EncryptedBackup).format === "budget-tracker-backup" && (parsed as EncryptedBackup).encrypted);
}

export async function openEncryptedBackup(backup: EncryptedBackup, passphrase: string): Promise<AppData> {
  try {
    const { key } = await deriveKeyFromSecret(passphrase, unb64(backup.salt), backup.kdf_params);
    return normalize(await decryptJSON(key, backup.data, AAD));
  } catch {
    throw new Error("That passphrase doesn't open this backup.");
  }
}

export function plainBackup(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}
