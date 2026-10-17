"use client";

import { b64, decryptBytes, encryptBytes, hkdfKey, parseEnvelope, randomBytes, serializeEnvelope, toBytes, unb64, type Bytes } from "@/lib/crypto";
import { unwrapFromDevice, wrapForDevice, type KV } from "@/lib/pin";
import { META } from "@/lib/db";

interface BioWrapper {
  v: 1;
  credentialId: string;
  prfSalt: string;
  hkdfSalt: string;
  outer: string;
}

const AAD = "budget:biometric:dek:v1";

type PrfResults = { enabled?: boolean; results?: { first?: ArrayBuffer | ArrayBufferView } };

export async function biometricSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
  try {
    const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!platform) return false;
    const getCaps = (PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> }).getClientCapabilities;
    if (getCaps) {
      const caps = await getCaps();
      if (caps["extension:prf"] === false) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function hasBiometric(kv: KV): Promise<boolean> {
  return Boolean(await kv.get<BioWrapper>(META.bio));
}

function prfFirst(cred: PublicKeyCredential): Bytes | null {
  const ext = cred.getClientExtensionResults() as { prf?: PrfResults };
  const first = ext.prf?.results?.first;
  return first ? toBytes(first) : null;
}

async function evaluatePrf(credentialId: Bytes, prfSalt: Bytes): Promise<Bytes> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ id: credentialId, type: "public-key" }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Biometric unlock was cancelled.");
  const out = prfFirst(cred);
  if (!out) throw new Error("This device can't use biometric unlock.");
  return out;
}

export async function enableBiometric(kv: KV, dekRaw: Bytes, user: { id: string; name: string }): Promise<void> {
  const prfSalt = randomBytes(32);
  const created = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Budget", id: window.location.hostname },
      user: { id: new TextEncoder().encode(user.id.slice(0, 64)), name: user.name || "Budget user", displayName: user.name || "Budget user" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!created) throw new Error("Biometric setup was cancelled.");
  const ext = created.getClientExtensionResults() as { prf?: PrfResults };
  if (ext.prf && ext.prf.enabled === false) throw new Error("This device can't use biometric unlock.");
  const credentialId = toBytes(created.rawId);
  const secret = prfFirst(created) ?? (await evaluatePrf(credentialId, prfSalt));
  const hkdfSalt = randomBytes(16);
  const key = await hkdfKey(secret, hkdfSalt, AAD);
  secret.fill(0);
  const inner = await wrapForDevice(kv, dekRaw);
  const outer = serializeEnvelope(await encryptBytes(key, new TextEncoder().encode(inner), AAD));
  const wrapper: BioWrapper = { v: 1, credentialId: b64(credentialId), prfSalt: b64(prfSalt), hkdfSalt: b64(hkdfSalt), outer };
  await kv.set(META.bio, wrapper);
}

export async function unlockWithBiometric(kv: KV): Promise<Bytes> {
  const wrapper = await kv.get<BioWrapper>(META.bio);
  if (!wrapper) throw new Error("Biometric unlock isn't set up on this device.");
  const secret = await evaluatePrf(unb64(wrapper.credentialId), unb64(wrapper.prfSalt));
  const key = await hkdfKey(secret, unb64(wrapper.hkdfSalt), AAD);
  secret.fill(0);
  const inner = await decryptBytes(key, parseEnvelope(wrapper.outer), AAD);
  return unwrapFromDevice(kv, new TextDecoder().decode(inner));
}

export async function disableBiometric(kv: KV): Promise<void> {
  await kv.del(META.bio);
}
