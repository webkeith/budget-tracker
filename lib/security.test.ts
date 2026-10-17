import { describe, expect, it } from "vitest";
import {
  ARGON2_PARAMS,
  decodeRecoveryKey,
  decryptJSON,
  encodeRecoveryKey,
  encryptJSON,
  importAesKey,
  passphraseStrength,
  randomBytes,
  unb64,
  b64,
} from "@/lib/crypto";
import { changePassphrase, createVault, generateDekRaw, generateRecoveryKey, rotateRecoveryKey, unlockWithPassphrase, unlockWithRecovery, WrongSecretError } from "@/lib/vault";
import { attemptsLeft, hasPin, memoryKV, PIN_MAX_ATTEMPTS, setupPin, unlockWithPin } from "@/lib/pin";

const FAST = { kdf: "argon2id" as const, m: 1024, t: 1, p: 1 };

describe("crypto", () => {
  it("round-trips JSON with AAD", async () => {
    const key = await importAesKey(randomBytes(32));
    const env = await encryptJSON(key, { amount: 4200, name: "Electricity" }, "budget:record:payables:p1");
    expect(env.ct).not.toContain("Electricity");
    expect(await decryptJSON(key, env, "budget:record:payables:p1")).toEqual({ amount: 4200, name: "Electricity" });
  });

  it("uses a fresh IV per write", async () => {
    const key = await importAesKey(randomBytes(32));
    const a = await encryptJSON(key, { x: 1 });
    const b = await encryptJSON(key, { x: 1 });
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("detects tampering and swapped rows", async () => {
    const key = await importAesKey(randomBytes(32));
    const env = await encryptJSON(key, { amount: 1 }, "budget:record:incomes:a");
    const bytes = unb64(env.ct);
    bytes[0] ^= 1;
    await expect(decryptJSON(key, { ...env, ct: b64(bytes) }, "budget:record:incomes:a")).rejects.toThrow();
    await expect(decryptJSON(key, env, "budget:record:incomes:b")).rejects.toThrow();
  });

  it("encodes and decodes recovery keys", () => {
    const raw = randomBytes(16);
    const text = encodeRecoveryKey(raw);
    expect(text).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
    expect(Array.from(decodeRecoveryKey(text.toLowerCase()))).toEqual(Array.from(raw));
  });

  it("rates passphrase strength", () => {
    expect(passphraseStrength("short").score).toBe(0);
    expect(passphraseStrength("correct horse battery staple").score).toBeGreaterThanOrEqual(3);
  });
});

describe("vault", () => {
  it("unlocks with passphrase and recovery key, rejects wrong ones", async () => {
    const dek = generateDekRaw();
    const recovery = generateRecoveryKey();
    const vault = await createVault("my long passphrase", dek, recovery.raw, FAST);
    expect(JSON.stringify(vault)).not.toContain(b64(dek));
    expect(Array.from(await unlockWithPassphrase(vault, "my long passphrase"))).toEqual(Array.from(dek));
    expect(Array.from(await unlockWithRecovery(vault, recovery.text))).toEqual(Array.from(dek));
    await expect(unlockWithPassphrase(vault, "wrong passphrase!")).rejects.toBeInstanceOf(WrongSecretError);
    await expect(unlockWithRecovery(vault, generateRecoveryKey().text)).rejects.toBeInstanceOf(WrongSecretError);
  });

  it("changes passphrase without changing the DEK", async () => {
    const dek = generateDekRaw();
    const vault = await createVault("first passphrase", dek, generateRecoveryKey().raw, FAST);
    const next = await changePassphrase(vault, dek, "second passphrase");
    await expect(unlockWithPassphrase(next, "first passphrase")).rejects.toBeInstanceOf(WrongSecretError);
    expect(Array.from(await unlockWithPassphrase(next, "second passphrase"))).toEqual(Array.from(dek));
    const rotated = await rotateRecoveryKey(next, dek);
    expect(Array.from(await unlockWithRecovery(rotated.vault, rotated.text))).toEqual(Array.from(dek));
  });

  it("rejects short passphrases", async () => {
    await expect(createVault("short", generateDekRaw(), generateRecoveryKey().raw, FAST)).rejects.toThrow();
  });

  it("uses Argon2id by default", () => {
    expect(ARGON2_PARAMS.kdf).toBe("argon2id");
  });
});

describe("pin", () => {
  it("unlocks with the right PIN and locks out after 5 wrong tries", async () => {
    const kv = memoryKV();
    const dek = generateDekRaw();
    await setupPin(kv, "4826", dek, FAST);
    expect(await hasPin(kv)).toBe(true);
    const ok = await unlockWithPin(kv, "4826");
    expect(ok.ok && Array.from(ok.dekRaw)).toEqual(Array.from(dek));

    for (let i = 1; i < PIN_MAX_ATTEMPTS; i++) {
      const r = await unlockWithPin(kv, "0000");
      expect(r).toEqual({ ok: false, reason: "wrong", remaining: PIN_MAX_ATTEMPTS - i });
    }
    expect(await attemptsLeft(kv)).toBe(1);
    expect(await unlockWithPin(kv, "0000")).toEqual({ ok: false, reason: "locked-out" });
    expect(await hasPin(kv)).toBe(false);
    expect(await unlockWithPin(kv, "4826")).toEqual({ ok: false, reason: "no-pin" });
  });

  it("resets attempts after a correct PIN", async () => {
    const kv = memoryKV();
    await setupPin(kv, "123456", generateDekRaw(), FAST);
    await unlockWithPin(kv, "000000");
    await unlockWithPin(kv, "000000");
    await unlockWithPin(kv, "123456");
    expect(await attemptsLeft(kv)).toBe(PIN_MAX_ATTEMPTS);
  });

  it("needs this device's key", async () => {
    const kv = memoryKV();
    await setupPin(kv, "2580", generateDekRaw(), FAST);
    kv.store.delete("deviceKey");
    const r = await unlockWithPin(kv, "2580");
    expect(r.ok).toBe(false);
  });

  it("rejects invalid PINs", async () => {
    await expect(setupPin(memoryKV(), "12", generateDekRaw(), FAST)).rejects.toThrow();
  });
});

describe("backup", async () => {
  const { createEncryptedBackup, isEncryptedBackup, openEncryptedBackup } = await import("@/lib/backup");
  const { DEFAULT_DATA } = await import("@/lib/storage");
  it("round-trips an encrypted backup", async () => {
    const data = { ...DEFAULT_DATA, assets: [{ id: "a", name: "Secret car", type: "vehicle" as const, value: 1 }] };
    const text = await createEncryptedBackup(data, "backup passphrase");
    expect(text).not.toContain("Secret car");
    const parsed = JSON.parse(text);
    expect(isEncryptedBackup(parsed)).toBe(true);
    expect((await openEncryptedBackup(parsed, "backup passphrase")).assets[0].name).toBe("Secret car");
    await expect(openEncryptedBackup(parsed, "nope nope nope")).rejects.toThrow();
  });
});

describe("argon2id (vendored)", () => {
  it("matches the reference implementation", async () => {
    const { deriveRawKey } = await import("@/lib/crypto");
    const out = await deriveRawKey("correct horse battery staple", new TextEncoder().encode("budget-salt-0001"), ARGON2_PARAMS);
    expect(Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("")).toBe("cc176fc633d5d09e5a088316eaefbf7cea4d5d1fc9fa6a7f41d18e9f860adab3");
  });
});
