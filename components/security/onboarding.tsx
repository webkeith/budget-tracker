"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Database, FlaskConical, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { generateDekRaw, generateRecoveryKey, MIN_PASSPHRASE } from "@/lib/vault";
import { passphraseStrength, wipe } from "@/lib/crypto";
import { readLegacyData, useSecurity, type StartChoice } from "@/lib/security";
import { Button } from "@/components/ui/button";
import { AppMark, SecureScreen, StepDots } from "@/components/security/secure-screen";
import { PassphraseField } from "@/components/security/passphrase-field";
import { RecoveryKeyCard } from "@/components/security/recovery-key-card";
import { PinSetup } from "@/components/security/pin-setup";
import { cn } from "@/lib/utils";

type Step = "passphrase" | "recovery" | "pin" | "start";
const STEPS: Step[] = ["passphrase", "recovery", "pin", "start"];

export function Onboarding() {
  const security = useSecurity();
  const [step, setStep] = useState<Step>("passphrase");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<StartChoice>("fresh");
  const keys = useRef<{ dek: Uint8Array<ArrayBuffer>; recovery: ReturnType<typeof generateRecoveryKey> } | null>(null);
  const legacy = useMemo(() => (typeof window === "undefined" ? null : readLegacyData()), []);

  if (!keys.current) keys.current = { dek: generateDekRaw(), recovery: generateRecoveryKey() };

  useEffect(() => {
    if (legacy) setChoice("import");
  }, [legacy]);

  const strength = passphraseStrength(pass);
  const passOk = pass.length >= MIN_PASSPHRASE && strength.score >= 2 && pass === confirm;

  const saveVault = async () => {
    setBusy(true);
    setError(null);
    try {
      await security.createVault(pass, keys.current!.dek, keys.current!.recovery.raw);
      wipe(keys.current!.recovery.raw);
      setPass("");
      setConfirm("");
      setStep("pin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your vault. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await security.finishOnboarding(keys.current!.dek, choice);
    } catch {
      setBusy(false);
      setError("Something went wrong. Try again.");
    }
  };

  const index = STEPS.indexOf(step);

  return (
    <SecureScreen wide={step === "recovery" || step === "start"}>
      <div className="mb-6 flex items-center justify-between">
        <AppMark size={40} />
        <StepDots step={index} total={STEPS.length} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {step === "passphrase" ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (passOk) setStep("recovery");
              }}
            >
              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Create your vault passphrase</h1>
                <p className="mt-2 text-[15px] text-fg-2">
                  Your numbers are encrypted on this device with a key only this passphrase can unlock.{" "}
                  <span className="text-fg">Only you can unlock this. Not even we can see your numbers.</span>
                </p>
              </div>
              <PassphraseField id="ob-pass" label="Passphrase" value={pass} onChange={setPass} showStrength autoFocus autoComplete="new-password" />
              <PassphraseField id="ob-confirm" label="Confirm passphrase" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              {confirm && pass !== confirm ? <p className="text-[13px] text-payable">The passphrases don&apos;t match yet.</p> : null}
              <Button type="submit" size="lg" className="w-full" disabled={!passOk}>
                Continue
                <ArrowRight aria-hidden />
              </Button>
            </form>
          ) : null}

          {step === "recovery" ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Save your recovery key</h1>
                <p className="mt-2 text-[15px] text-fg-2">
                  If you ever forget your passphrase, this key is the only way to get your data back. We can&apos;t reset it for you.
                </p>
              </div>
              <RecoveryKeyCard value={keys.current.recovery.text} account={security.user?.email} />
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-white/[0.02] px-4 py-3">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                  className="size-5 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[15px]">I saved my recovery key somewhere safe</span>
              </label>
              {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep("passphrase")} disabled={busy}>
                  Back
                </Button>
                <Button type="button" size="lg" className="flex-1" disabled={!saved || busy} onClick={saveVault}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
                  {busy ? "Securing your vault…" : "Continue"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "pin" ? (
            <PinSetup
              subtitle="Use it to open the app quickly on this device. Your passphrase still protects your data everywhere else."
              onDone={async (pin) => {
                await security.setupDevicePin(pin, keys.current!.dek);
                setStep("start");
              }}
            />
          ) : null}

          {step === "start" ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em]">How do you want to start?</h1>
                <p className="mt-2 text-[15px] text-fg-2">You can change this later in Settings.</p>
              </div>
              <div role="radiogroup" aria-label="Start with" className="space-y-2">
                {legacy ? (
                  <Choice
                    active={choice === "import"}
                    onSelect={() => setChoice("import")}
                    icon={<Database className="size-5" aria-hidden />}
                    title="Bring my existing data"
                    text="We found a budget saved on this device. It'll be encrypted and added to your account, then the unencrypted copy is removed."
                  />
                ) : null}
                <Choice
                  active={choice === "fresh"}
                  onSelect={() => setChoice("fresh")}
                  icon={<Sparkles className="size-5" aria-hidden />}
                  title="Start fresh"
                  text="An empty budget, ready for your income and bills."
                />
                <Choice
                  active={choice === "sample"}
                  onSelect={() => setChoice("sample")}
                  icon={<FlaskConical className="size-5" aria-hidden />}
                  title="Explore with sample data"
                  text="Realistic example numbers that stay on this device and never sync. Turn it off in Settings."
                />
              </div>
              {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
              <Button type="button" size="lg" className="w-full" disabled={busy} onClick={finish}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {busy ? "Setting things up…" : "Open my budget"}
              </Button>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </SecureScreen>
  );
}

function Choice({ active, onSelect, icon, title, text }: { active: boolean; onSelect: () => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-[16px] border px-4 py-3.5 text-left transition-colors",
        active ? "border-accent bg-accent/10" : "border-border bg-white/[0.02] hover:border-border-strong",
      )}
    >
      <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]", active ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-fg-2")}>{icon}</span>
      <span>
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-fg-2">{text}</span>
      </span>
    </button>
  );
}
