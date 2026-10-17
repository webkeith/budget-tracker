"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { useSecurity } from "@/lib/security";
import { MIN_PASSPHRASE } from "@/lib/vault";
import { passphraseStrength } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Avatar, SecureScreen } from "@/components/security/secure-screen";
import { PinKeypad } from "@/components/security/pin-keypad";
import { PassphraseField } from "@/components/security/passphrase-field";
import { PinSetup } from "@/components/security/pin-setup";

function Identity({ subtitle }: { subtitle: string }) {
  const { user, mode } = useSecurity();
  return (
    <div className="flex flex-col items-center text-center">
      <Avatar name={user?.name} src={user?.avatar} size={72} />
      <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">{mode === "local" ? "Budget is locked" : user?.name ?? "Welcome back"}</h1>
      <p className="mt-1 text-[14px] text-fg-2">{subtitle}</p>
    </div>
  );
}

function SignOutLink() {
  const { mode, signOut } = useSecurity();
  if (mode !== "supabase") return null;
  return (
    <button
      type="button"
      onClick={() => void signOut(true)}
      className="mx-auto mt-6 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] text-fg-2 hover:text-fg"
    >
      <LogOut className="size-4" aria-hidden />
      Sign out
    </button>
  );
}

export function LockScreen() {
  const security = useSecurity();
  const [mode, setMode] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  if (security.lockMethod === "pin") {
    return (
      <SecureScreen>
        <Identity subtitle="Enter your PIN" />
        <p className="mt-3 h-5 text-center text-[13px] text-payable" aria-live="assertive">
          {pinMessage}
        </p>
        <div className="mt-4">
          <PinKeypad
            length={security.pinDigits}
            label="PIN"
            onBiometric={
              security.biometric.enabled
                ? async () => {
                    try {
                      await security.unlockBiometric();
                    } catch (e) {
                      setPinMessage(e instanceof Error ? e.message : "Biometric unlock didn't work.");
                    }
                  }
                : undefined
            }
            onComplete={async (pin) => {
              const result = await security.unlockPin(pin);
              if (result.ok) return true;
              if (result.reason === "wrong") {
                setPinMessage(result.remaining === 1 ? "Wrong PIN. 1 try left before you'll need your passphrase." : `Wrong PIN. ${result.remaining} tries left.`);
              } else {
                setPinMessage(null);
              }
              return false;
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => security.usePassphraseInstead()}
          className="mx-auto mt-8 flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium text-accent"
        >
          Use passphrase instead
        </button>
        <SignOutLink />
      </SecureScreen>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "passphrase") await security.unlockPassphrase(secret);
      else await security.unlockRecovery(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(false);
    }
  };

  return (
    <SecureScreen>
      <Identity
        subtitle={
          security.pinAttemptsLeft <= 0
            ? "Too many wrong PINs. Unlock with your passphrase."
            : mode === "passphrase"
              ? "Enter your vault passphrase to unlock."
              : "Enter the recovery key you saved when you set up."
        }
      />
      <AnimatePresence mode="wait">
        <motion.form key={mode} onSubmit={submit} className="mt-8 space-y-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {mode === "passphrase" ? (
            <PassphraseField id="unlock-pass" label="Passphrase" value={secret} onChange={setSecret} autoFocus />
          ) : (
            <Field label="Recovery key" htmlFor="unlock-recovery">
              <TextInput
                id="unlock-recovery"
                value={secret}
                onChange={(e) => setSecret(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="font-mono tracking-[0.06em]"
              />
            </Field>
          )}
          {error ? (
            <p className="text-[13px] text-payable" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !secret.trim()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {busy ? "Unlocking…" : "Unlock"}
          </Button>
        </motion.form>
      </AnimatePresence>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "passphrase" ? "recovery" : "passphrase");
          setSecret("");
          setError(null);
        }}
        className="mx-auto mt-6 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-accent"
      >
        <KeyRound className="size-4" aria-hidden />
        {mode === "passphrase" ? "Forgot passphrase? Use recovery key" : "Use passphrase instead"}
      </button>
      <SignOutLink />
    </SecureScreen>
  );
}

export function NeedsPinScreen() {
  const security = useSecurity();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (security.recoveryUsed) {
    const ok = pass.length >= MIN_PASSPHRASE && passphraseStrength(pass).score >= 2 && pass === confirm;
    return (
      <SecureScreen>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ok) return;
            setBusy(true);
            setError(null);
            try {
              await security.resetPassphraseAfterRecovery(pass);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save your new passphrase.");
              setBusy(false);
            }
          }}
        >
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Create a new passphrase</h1>
            <p className="mt-2 text-[15px] text-fg-2">Your recovery key worked. Pick a new passphrase you&apos;ll remember. Your recovery key keeps working too.</p>
          </div>
          <PassphraseField id="reset-pass" label="New passphrase" value={pass} onChange={setPass} showStrength autoFocus autoComplete="new-password" />
          <PassphraseField id="reset-confirm" label="Confirm passphrase" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={!ok || busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Save passphrase
          </Button>
        </form>
      </SecureScreen>
    );
  }

  return (
    <SecureScreen>
      <PinSetup title="Set a PIN for this device" onDone={(pin) => security.completePinSetup(pin)} />
    </SecureScreen>
  );
}
