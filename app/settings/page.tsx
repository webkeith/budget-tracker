"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  FlaskConical,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  MonitorSmartphone,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import type { AppData } from "@/types";
import { useStore } from "@/lib/store";
import { useSecurity } from "@/lib/security";
import { usePrivacy } from "@/lib/privacy";
import { CURRENCIES, ordinal, todayISO } from "@/lib/format";
import { importJSON } from "@/lib/storage";
import { createEncryptedBackup, isEncryptedBackup, openEncryptedBackup, plainBackup, type EncryptedBackup } from "@/lib/backup";
import { MIN_PASSPHRASE } from "@/lib/vault";
import { isValidPin } from "@/lib/pin";
import { passphraseStrength } from "@/lib/crypto";
import { itemVariants } from "@/lib/motion";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/security/secure-screen";
import { PassphraseField } from "@/components/security/passphrase-field";
import { RecoveryKeyCard } from "@/components/security/recovery-key-card";

function Group({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <motion.section variants={itemVariants} id={id} className="scroll-mt-24">
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-2">{title}</h2>
      <div className="card divide-y divide-white/[0.05]">{children}</div>
    </motion.section>
  );
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: React.ReactNode; htmlFor?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-[15px] font-medium">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-[13px] text-fg-2">{hint}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const pinInput = (id: string, label: string, value: string, set: (v: string) => void, autoFocus = false) => (
  <Field label={label} htmlFor={id}>
    <TextInput
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="num tracking-[0.4em]"
    />
  </Field>
);

type Dialog = null | "pin" | "passphrase" | "recovery" | "biometric" | "export" | "export-plain" | "import" | "signout" | "remove-device" | "delete" | "reset";

export default function SettingsPage() {
  const store = useStore();
  const { data, updateSettings, sampleMode, setSampleMode, replaceData, resetData, toast } = store;
  const security = useSecurity();
  const privacy = usePrivacy();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [recoveryText, setRecoveryText] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<EncryptedBackup | null>(null);
  const [pendingSync, setPendingSync] = useState(0);

  const open = (d: Dialog) => {
    setA("");
    setB("");
    setC("");
    setError(null);
    setBusy(false);
    setRecoveryText(null);
    setDialog(d);
  };
  const close = () => {
    setDialog(null);
    setPendingImport(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (isEncryptedBackup(parsed)) {
        setPendingImport(parsed);
        open("import");
        return;
      }
      await replaceData(importJSON(text));
      toast("Backup restored and encrypted", "success");
    } catch {
      toast("That file doesn't look like a backup.", "warning");
    }
  };

  const strongEnough = (p: string) => p.length >= MIN_PASSPHRASE && passphraseStrength(p).score >= 2;
  const isLocal = security.mode === "local";
  const user = security.user;

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Settings" description="Make the app work the way you like." />
      <div className="space-y-6">
        <Group title="Account" id="account">
          <div className="flex items-center gap-4 px-5 py-4">
            <Avatar name={user?.name} src={user?.avatar} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{isLocal ? "Local vault" : user?.name}</p>
              <p className="truncate text-[13px] text-fg-2">{isLocal ? "Supabase isn't configured. Data stays encrypted in this browser." : user?.email}</p>
            </div>
            {!isLocal ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-11"
                onClick={() =>
                  run(async () => {
                    const r = await security.signOut();
                    if (r && r.pending) {
                      setPendingSync(r.pending);
                      open("signout");
                    }
                  })
                }
              >
                <LogOut aria-hidden />
                Sign out
              </Button>
            ) : null}
          </div>
        </Group>

        <Group title="Security" id="security">
          <Row label="Lock now" hint="Clears your numbers from memory until you unlock again.">
            <Button variant="secondary" onClick={security.lock}>
              <Lock aria-hidden />
              Lock
            </Button>
          </Row>
          <Row label="Auto-lock after" htmlFor="set-autolock" hint="When you haven't touched the app for a while.">
            <Select
              id="set-autolock"
              className="w-full sm:w-44"
              value={String(security.prefs.autoLockMinutes)}
              onChange={(v) => security.setPrefs({ autoLockMinutes: Number(v) })}
              options={[
                { value: "1", label: "1 minute" },
                { value: "5", label: "5 minutes" },
                { value: "15", label: "15 minutes" },
                { value: "30", label: "30 minutes" },
              ]}
            />
          </Row>
          <Row label="Lock when I leave the app" htmlFor="set-hiddenlock" hint="After switching tabs or apps for this long.">
            <Select
              id="set-hiddenlock"
              className="w-full sm:w-44"
              value={String(security.prefs.hiddenLockMinutes)}
              onChange={(v) => security.setPrefs({ hiddenLockMinutes: Number(v) })}
              options={[
                { value: "0", label: "Immediately" },
                { value: "1", label: "After 1 minute" },
                { value: "5", label: "After 5 minutes" },
                { value: "15", label: "After 15 minutes" },
              ]}
            />
          </Row>
          <Row label="Change PIN" hint={`${security.pinDigits}-digit PIN on this device.`}>
            <Button variant="secondary" onClick={() => open("pin")}>
              Change PIN
            </Button>
          </Row>
          {security.biometric.supported ? (
            <Row label="Unlock with Face ID / fingerprint" htmlFor="set-bio" hint="Uses a passkey on this device. Your PIN still works.">
              <Switch
                id="set-bio"
                label="Biometric unlock"
                checked={security.biometric.enabled}
                onChange={(on) => (on ? open("biometric") : void run(() => security.setBiometric(false)))}
              />
            </Row>
          ) : null}
          <Row label="Change passphrase" hint="Re-wraps your key. Your data isn't re-encrypted.">
            <Button variant="secondary" onClick={() => open("passphrase")}>
              <KeyRound aria-hidden />
              Change
            </Button>
          </Row>
          <Row label="New recovery key" hint="Replaces your old recovery key, which stops working.">
            <Button variant="secondary" onClick={() => open("recovery")}>
              Create new key
            </Button>
          </Row>
          <Row label="Remove this device" hint="Erases the encrypted copy, PIN, and keys stored in this browser.">
            <Button variant="secondary" onClick={() => open("remove-device")}>
              <MonitorSmartphone aria-hidden />
              Remove
            </Button>
          </Row>
        </Group>

        <Group title="Privacy" id="privacy">
          <Row label="Hide numbers now" htmlFor="set-hide" hint="Press H anytime. Press and hold a hidden amount to peek.">
            <Switch id="set-hide" label="Hide numbers" checked={privacy.hidden} onChange={privacy.setHidden} />
          </Row>
          <Row label="Hide numbers on launch" htmlFor="set-hide-launch">
            <Switch id="set-hide-launch" label="Hide numbers on launch" checked={privacy.prefs.hideOnLaunch} onChange={(v) => privacy.setPrefs({ hideOnLaunch: v })} />
          </Row>
          <Row label="Also hide percentages" htmlFor="set-hide-pct" hint="Progress rings and bars stay visible.">
            <Switch id="set-hide-pct" label="Also hide percentages" checked={privacy.prefs.hidePercentages} onChange={(v) => privacy.setPrefs({ hidePercentages: v })} />
          </Row>
          <Row label="Blur when the app is in the background" htmlFor="set-blur" hint="Hides your screen in the app switcher and when you switch tabs.">
            <Switch id="set-blur" label="Blur in background" checked={privacy.prefs.blurOnBackground} onChange={(v) => privacy.setPrefs({ blurOnBackground: v })} />
          </Row>
        </Group>

        <Group title="Preferences">
          <Row label="Currency" htmlFor="set-currency" hint="Used everywhere amounts appear.">
            <Select
              id="set-currency"
              className="w-full sm:w-64"
              value={data.settings.currency}
              onChange={(v) => updateSettings({ currency: v })}
              options={CURRENCIES.map((cur) => ({ value: cur.code, label: `${cur.code} — ${cur.label}` }))}
            />
          </Row>
          <Row label="Month starts on" htmlFor="set-startday" hint="Handy if your budget runs payday to payday.">
            <Select
              id="set-startday"
              className="w-full sm:w-40"
              value={String(data.settings.startDay)}
              onChange={(v) => updateSettings({ startDay: Number(v) })}
              options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `The ${ordinal(i + 1)}` }))}
            />
          </Row>
        </Group>

        <Group title="Sample data">
          <Row
            label="Show sample numbers"
            htmlFor="set-sample"
            hint={sampleMode ? "You're viewing example data. It's never saved or synced. Turn off to see your own budget." : "Preview the app with realistic example data. Your own data is untouched."}
          >
            <div className="flex items-center gap-2">
              <FlaskConical aria-hidden className="size-4 text-fg-2" />
              <Switch
                id="set-sample"
                label="Show sample numbers"
                checked={sampleMode}
                onChange={async (on) => {
                  await setSampleMode(on);
                  toast(on ? "Sample data on" : "Back to your data", "success");
                }}
              />
            </div>
          </Row>
        </Group>

        <Group title="Your data">
          <Row label="Export encrypted backup" hint="Locked with your vault passphrase. Safe to store anywhere.">
            <Button variant="secondary" onClick={() => open("export")}>
              <Download aria-hidden />
              Export
            </Button>
          </Row>
          <Row label="Export unencrypted" hint="Plain JSON anyone can read. Only use this to move data elsewhere.">
            <Button variant="ghost" onClick={() => open("export-plain")}>
              <ShieldAlert aria-hidden />
              Export as JSON
            </Button>
          </Row>
          <Row label="Import" hint="Restore from an encrypted or plain backup. Replaces what's here now.">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden />
              Import
            </Button>
          </Row>
          <Row label="Reset data" hint="Deletes every entry everywhere. Settings and your vault are kept.">
            <Button variant="danger" onClick={() => open("reset")}>
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </Row>
          <Row label={isLocal ? "Erase everything on this device" : "Delete account"} hint={isLocal ? "Removes your vault, PIN, and all data from this browser." : "Permanently deletes your account, vault, and every encrypted record."}>
            <Button variant="danger" onClick={() => open("delete")}>
              <Trash2 aria-hidden />
              {isLocal ? "Erase" : "Delete account"}
            </Button>
          </Row>
        </Group>

        <p className="flex items-start gap-2 px-1 text-[13px] text-fg-2">
          <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
          Every amount, name, and note is encrypted on this device before it&apos;s saved{isLocal ? "" : " or synced"}. Only your passphrase, recovery key, or this device&apos;s PIN can unlock it.
        </p>
      </div>

      <Sheet
        open={dialog === "pin"}
        onOpenChange={(o) => !o && close()}
        title="Change PIN"
        footer={
          <Button
            className="w-full"
            disabled={busy || !isValidPin(b) || b !== c || a.length < 4}
            onClick={() =>
              run(async () => {
                const r = await security.changePin(a, b);
                if (!r.ok) {
                  throw new Error(r.reason === "wrong" ? `That's not your current PIN. ${r.remaining} tries left.` : "Too many tries. Unlock with your passphrase next time.");
                }
                toast("PIN updated", "success");
                close();
              })
            }
          >
            Save PIN
          </Button>
        }
      >
        <div className="space-y-4">
          {pinInput("pin-current", "Current PIN", a, setA, true)}
          {pinInput("pin-new", "New PIN (4–6 digits)", b, setB)}
          {pinInput("pin-confirm", "Confirm new PIN", c, setC)}
          {c && b !== c ? <p className="text-[13px] text-payable">The new PINs don&apos;t match.</p> : null}
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={dialog === "biometric"}
        onOpenChange={(o) => !o && close()}
        title="Turn on biometric unlock"
        description="Enter your PIN, then confirm with Face ID, Touch ID, or your fingerprint."
        footer={
          <Button
            className="w-full"
            disabled={busy || a.length < 4}
            onClick={() =>
              run(async () => {
                await security.setBiometric(true, a);
                toast("Biometric unlock is on", "success");
                close();
              })
            }
          >
            <Fingerprint aria-hidden />
            Continue
          </Button>
        }
      >
        <div className="space-y-4">
          {pinInput("bio-pin", "PIN", a, setA, true)}
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={dialog === "passphrase"}
        onOpenChange={(o) => !o && close()}
        title="Change passphrase"
        description="Use something long that you'll remember. Your recovery key keeps working."
        footer={
          <Button
            className="w-full"
            disabled={busy || !a || !strongEnough(b) || b !== c}
            onClick={() =>
              run(async () => {
                await security.changePassphrase(a, b);
                toast("Passphrase updated", "success");
                close();
              })
            }
          >
            Save passphrase
          </Button>
        }
      >
        <div className="space-y-4">
          <PassphraseField id="pp-current" label="Current passphrase" value={a} onChange={setA} autoFocus />
          <PassphraseField id="pp-new" label="New passphrase" value={b} onChange={setB} showStrength autoComplete="new-password" />
          <PassphraseField id="pp-confirm" label="Confirm new passphrase" value={c} onChange={setC} autoComplete="new-password" />
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={dialog === "recovery"}
        onOpenChange={(o) => !o && close()}
        title={recoveryText ? "Your new recovery key" : "Create a new recovery key"}
        description={recoveryText ? "Save it now. You won't see it again, and your old key no longer works." : "Confirm your passphrase first."}
        footer={
          recoveryText ? (
            <Button className="w-full" onClick={close}>
              I saved it
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={busy || !a}
              onClick={() =>
                run(async () => {
                  setRecoveryText(await security.rotateRecovery(a));
                  setA("");
                })
              }
            >
              Create new key
            </Button>
          )
        }
      >
        {recoveryText ? (
          <RecoveryKeyCard value={recoveryText} account={user?.email} />
        ) : (
          <div className="space-y-4">
            <PassphraseField id="rk-pass" label="Passphrase" value={a} onChange={setA} autoFocus />
            {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
          </div>
        )}
      </Sheet>

      <Sheet
        open={dialog === "export"}
        onOpenChange={(o) => !o && close()}
        title="Export encrypted backup"
        description="Enter your vault passphrase. You'll need the same passphrase to restore this file."
        footer={
          <Button
            className="w-full"
            disabled={busy || !a}
            onClick={() =>
              run(async () => {
                if (!(await security.verifyPassphrase(a))) throw new Error("That passphrase doesn't match.");
                download(`budget-backup-${todayISO()}.encrypted.json`, await createEncryptedBackup(data as AppData, a));
                toast("Encrypted backup downloaded", "success");
                close();
              })
            }
          >
            <Download aria-hidden />
            {busy ? "Encrypting…" : "Download backup"}
          </Button>
        }
      >
        <div className="space-y-4">
          <PassphraseField id="exp-pass" label="Passphrase" value={a} onChange={setA} autoFocus />
          {sampleMode ? <p className="text-[13px] text-due">Sample data is on, so this backup will contain the sample numbers.</p> : null}
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={dialog === "export-plain"}
        onOpenChange={(o) => !o && close()}
        title="Export without encryption?"
        description="Anyone who gets this file can read every amount, name, and note."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                download(`budget-export-${todayISO()}.json`, plainBackup(data));
                toast("Unencrypted export downloaded", "warning");
                close();
              }}
            >
              I understand, export
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-fg-2">Delete the file once you&apos;ve finished with it. For backups, use the encrypted export instead.</p>
      </Sheet>

      <Sheet
        open={dialog === "import"}
        onOpenChange={(o) => !o && close()}
        title="Open encrypted backup"
        description="Enter the passphrase that was used when this backup was exported."
        footer={
          <Button
            className="w-full"
            disabled={busy || !a || !pendingImport}
            onClick={() =>
              run(async () => {
                const restored = await openEncryptedBackup(pendingImport!, a);
                await replaceData(restored);
                toast("Backup restored", "success");
                close();
              })
            }
          >
            <Upload aria-hidden />
            Restore
          </Button>
        }
      >
        <div className="space-y-4">
          <PassphraseField id="imp-pass" label="Backup passphrase" value={a} onChange={setA} autoFocus />
          <p className="text-[13px] text-fg-2">This replaces what&apos;s here now.</p>
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={dialog === "signout"}
        onOpenChange={(o) => !o && close()}
        title="Some changes haven't synced"
        description={`${pendingSync} change${pendingSync === 1 ? "" : "s"} are only on this device. Signing out now will discard them.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Stay signed in
            </Button>
            <Button variant="danger" onClick={() => void security.signOut(true)}>
              Sign out anyway
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-fg-2">Check your connection and try again in a moment to keep them.</p>
      </Sheet>

      <Sheet
        open={dialog === "remove-device"}
        onOpenChange={(o) => !o && close()}
        title="Remove this device?"
        description={isLocal ? "This erases your vault and every entry from this browser. Export a backup first." : "Your synced data stays in your account. You'll need your passphrase to use this device again."}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void security.removeDevice()}>
              Remove device
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-fg-2">The PIN, biometric unlock, and encrypted cache on this device are deleted.</p>
      </Sheet>

      <Sheet
        open={dialog === "reset"}
        onOpenChange={(o) => !o && close()}
        title="Reset all data?"
        description={isLocal ? "This removes every entry on this device." : "This removes every entry on all your devices."}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await resetData();
                close();
                toast("All entries deleted");
              }}
            >
              Reset everything
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-fg-2">Your vault, passphrase, and PIN stay the same. Export a backup first if you might want this data later.</p>
      </Sheet>

      <Sheet
        open={dialog === "delete"}
        onOpenChange={(o) => !o && close()}
        title={isLocal ? "Erase everything?" : "Delete your account?"}
        description="This can't be undone."
        footer={
          <Button
            variant="danger"
            className="w-full"
            disabled={busy || a !== "DELETE"}
            onClick={() =>
              run(async () => {
                await security.deleteAccount();
              })
            }
          >
            <Trash2 aria-hidden />
            {isLocal ? "Erase everything" : "Delete account forever"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-[14px] text-fg-2">
            {isLocal
              ? "Your vault, PIN, and every encrypted entry in this browser will be erased."
              : "Your Google sign-in, vault, and every encrypted record will be permanently deleted from our servers and this device."}
          </p>
          <Field label="Type DELETE to confirm" htmlFor="del-confirm">
            <TextInput id="del-confirm" value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" autoFocus />
          </Field>
          {error ? <p className="text-[13px] text-payable" role="alert">{error}</p> : null}
        </div>
      </Sheet>
    </Page>
  );
}
