"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";
import { META, destroyDB, kvFor, openDB, type BudgetDB } from "@/lib/db";
import { supabaseRemote, type Remote } from "@/lib/remote";
import { SyncEngine } from "@/lib/sync";
import { wipe, type Bytes } from "@/lib/crypto";
import {
  changePassphrase as rewrapPassphrase,
  createVault as buildVault,
  dekFromRaw,
  rotateRecoveryKey,
  unlockWithPassphrase,
  unlockWithRecovery,
  type VaultRecord,
} from "@/lib/vault";
import { attemptsLeft, hasPin, pinLength, setupPin, unlockWithPin, type KV, type PinResult } from "@/lib/pin";
import { biometricSupported, disableBiometric, enableBiometric, hasBiometric, unlockWithBiometric } from "@/lib/biometric";
import { BACKUP_KEY, SAMPLE_FLAG_KEY, STORAGE_KEY, normalize, setFlag } from "@/lib/storage";

export type Phase = "loading" | "signed-out" | "onboarding" | "locked" | "needs-pin" | "unlocked" | "error";
export type LockMethod = "pin" | "passphrase";
export type StartChoice = "import" | "sample" | "fresh";

export interface AccountUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface SecurityPrefs {
  autoLockMinutes: number;
  hiddenLockMinutes: number;
}

const PREFS_KEY = "budget-tracker:security-prefs";
const DEFAULT_PREFS: SecurityPrefs = { autoLockMinutes: 5, hiddenLockMinutes: 1 };

function readPrefs(): SecurityPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function readLegacyData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (localStorage.getItem(SAMPLE_FLAG_KEY) === "1" && !localStorage.getItem(BACKUP_KEY)) return null;
    const source = localStorage.getItem(SAMPLE_FLAG_KEY) === "1" ? localStorage.getItem(BACKUP_KEY) : raw;
    if (!source) return null;
    const data = normalize(JSON.parse(source));
    const count = data.incomes.length + data.payables.length + data.savings.length + data.assets.length + data.investments.length;
    return count > 0 ? data : null;
  } catch {
    return null;
  }
}

export function clearLegacyData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

interface SecurityValue {
  phase: Phase;
  mode: "supabase" | "local";
  user: AccountUser | null;
  error?: string;
  lockMethod: LockMethod;
  pinDigits: number;
  pinAttemptsLeft: number;
  biometric: { supported: boolean; enabled: boolean };
  recoveryUsed: boolean;
  engine: SyncEngine | null;
  prefs: SecurityPrefs;
  setPrefs: (p: Partial<SecurityPrefs>) => void;
  createVault: (passphrase: string, dekRaw: Bytes, recoveryRaw: Bytes) => Promise<void>;
  setupDevicePin: (pin: string, dekRaw: Bytes) => Promise<void>;
  finishOnboarding: (dekRaw: Bytes, choice: StartChoice) => Promise<void>;
  unlockPin: (pin: string) => Promise<PinResult>;
  unlockPassphrase: (passphrase: string) => Promise<void>;
  unlockRecovery: (recoveryKey: string) => Promise<void>;
  resetPassphraseAfterRecovery: (next: string) => Promise<void>;
  completePinSetup: (pin: string) => Promise<void>;
  unlockBiometric: () => Promise<void>;
  usePassphraseInstead: () => void;
  lock: () => void;
  signOut: (force?: boolean) => Promise<{ pending: number } | void>;
  removeDevice: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  changePassphrase: (current: string, next: string) => Promise<void>;
  rotateRecovery: (passphrase: string) => Promise<string>;
  verifyPassphrase: (passphrase: string) => Promise<boolean>;
  changePin: (current: string, next: string) => Promise<PinResult | { ok: true }>;
  setBiometric: (on: boolean, pin?: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
}

const SecurityContext = createContext<SecurityValue | null>(null);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const mode = isSupabaseConfigured ? "supabase" : "local";
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string>();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [vault, setVault] = useState<VaultRecord | null>(null);
  const [lockMethod, setLockMethod] = useState<LockMethod>("pin");
  const [pinDigits, setPinDigits] = useState(6);
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState(5);
  const [biometric, setBiometricState] = useState({ supported: false, enabled: false });
  const [recoveryUsed, setRecoveryUsed] = useState(false);
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const [prefs, setPrefsState] = useState<SecurityPrefs>(DEFAULT_PREFS);
  const dbRef = useRef<BudgetDB | null>(null);
  const kvRef = useRef<KV | null>(null);
  const remoteRef = useRef<Remote | null>(null);
  const pendingRaw = useRef<Bytes | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);

  const refreshLockState = useCallback(async () => {
    const kv = kvRef.current!;
    const pin = await hasPin(kv);
    setLockMethod(pin ? "pin" : "passphrase");
    setPinDigits(await pinLength(kv));
    setPinAttemptsLeft(await attemptsLeft(kv));
    setBiometricState({ supported: await biometricSupported(), enabled: await hasBiometric(kv) });
  }, []);

  useEffect(() => {
    setPrefsState(readPrefs());
    let cancelled = false;
    (async () => {
      try {
        let account: AccountUser;
        if (mode === "supabase") {
          const supabase = getSupabase()!;
          const { data } = await supabase.auth.getSession();
          const u = data.session?.user;
          if (!u) {
            if (!cancelled) setPhase("signed-out");
            if (!window.location.pathname.startsWith("/sign-in")) window.location.replace("/sign-in");
            return;
          }
          const meta = u.user_metadata ?? {};
          account = { id: u.id, email: u.email, name: meta.full_name ?? meta.name ?? u.email, avatar: meta.avatar_url ?? meta.picture };
          remoteRef.current = supabaseRemote(supabase, u.id);
        } else {
          account = { id: "local", name: "Local vault" };
        }
        const db = openDB(account.id);
        dbRef.current = db;
        kvRef.current = kvFor(db);

        let v = ((await db.meta.get(META.vault))?.value as VaultRecord | undefined) ?? null;
        if (remoteRef.current) {
          try {
            const remoteVault = await remoteRef.current.getVault();
            if (remoteVault) {
              v = remoteVault;
              await db.meta.put({ key: META.vault, value: remoteVault });
            } else if (v) {
              await remoteRef.current.saveVault(v);
            }
          } catch {
            /* offline: use cached vault */
          }
        }
        if (cancelled) return;
        setUser(account);
        setVault(v);
        if (!v) {
          setPhase("onboarding");
          return;
        }
        await refreshLockState();
        setPhase("locked");
      } catch {
        if (!cancelled) {
          setError("We couldn't open your secure storage. Check that this browser allows site data.");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, refreshLockState]);

  const completeUnlock = useCallback(async (dekRaw: Bytes, choice?: StartChoice) => {
    const dek = await dekFromRaw(dekRaw);
    wipe(dekRaw);
    pendingRaw.current = null;
    const next = new SyncEngine({ db: dbRef.current!, dek, remote: remoteRef.current });
    if (choice === "import") {
      const legacy = readLegacyData();
      if (legacy) {
        await next.importData(legacy);
        clearLegacyData();
      }
      setFlag(SAMPLE_FLAG_KEY, false);
    } else if (choice === "sample") {
      setFlag(SAMPLE_FLAG_KEY, true);
    } else if (choice === "fresh") {
      setFlag(SAMPLE_FLAG_KEY, false);
    }
    engineRef.current?.stop();
    engineRef.current = next;
    setEngine(next);
    setPhase("unlocked");
  }, []);

  const lock = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setEngine(null);
    wipe(pendingRaw.current);
    pendingRaw.current = null;
    void refreshLockState().then(() => setPhase("locked"));
  }, [refreshLockState]);

  useEffect(() => {
    if (phase !== "unlocked") return;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let hiddenAt = 0;
    const reset = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (prefs.autoLockMinutes > 0) idleTimer = setTimeout(lock, prefs.autoLockMinutes * 60_000);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= prefs.hiddenLockMinutes * 60_000) lock();
      else reset();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    reset();
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, prefs.autoLockMinutes, prefs.hiddenLockMinutes, lock]);

  const saveVault = useCallback(async (v: VaultRecord) => {
    if (remoteRef.current) await remoteRef.current.saveVault(v);
    await dbRef.current!.meta.put({ key: META.vault, value: v });
    setVault(v);
  }, []);

  const value = useMemo<SecurityValue>(
    () => ({
      phase,
      mode,
      user,
      error,
      lockMethod,
      pinDigits,
      pinAttemptsLeft,
      biometric,
      recoveryUsed,
      engine,
      prefs,
      setPrefs: (p) => {
        setPrefsState((prev) => {
          const next = { ...prev, ...p };
          try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      },
      async createVault(passphrase, dekRaw, recoveryRaw) {
        const v = await buildVault(passphrase, dekRaw, recoveryRaw);
        await saveVault(v);
      },
      async setupDevicePin(pin, dekRaw) {
        await setupPin(kvRef.current!, pin, dekRaw);
      },
      async finishOnboarding(dekRaw, choice) {
        await completeUnlock(dekRaw, choice);
      },
      async unlockPin(pin) {
        const result = await unlockWithPin(kvRef.current!, pin);
        if (result.ok) {
          await completeUnlock(result.dekRaw);
          return { ok: true, dekRaw: new Uint8Array(0) };
        }
        if (result.reason === "wrong") setPinAttemptsLeft(result.remaining);
        if (result.reason === "locked-out" || result.reason === "no-pin") {
          setPinAttemptsLeft(0);
          setLockMethod("passphrase");
        }
        return result;
      },
      async unlockPassphrase(passphrase) {
        if (!vault) throw new Error("No vault");
        const raw = await unlockWithPassphrase(vault, passphrase);
        setRecoveryUsed(false);
        if (await hasPin(kvRef.current!)) {
          await completeUnlock(raw);
        } else {
          pendingRaw.current = raw;
          setPhase("needs-pin");
        }
      },
      async unlockRecovery(recoveryKey) {
        if (!vault) throw new Error("No vault");
        const raw = await unlockWithRecovery(vault, recoveryKey);
        pendingRaw.current = raw;
        setRecoveryUsed(true);
        setPhase("needs-pin");
      },
      async resetPassphraseAfterRecovery(next) {
        if (!vault || !pendingRaw.current) throw new Error("Unlock first");
        await saveVault(await rewrapPassphrase(vault, pendingRaw.current, next));
        setRecoveryUsed(false);
      },
      async completePinSetup(pin) {
        if (!pendingRaw.current) throw new Error("Unlock first");
        await setupPin(kvRef.current!, pin, pendingRaw.current);
        await completeUnlock(pendingRaw.current);
      },
      async unlockBiometric() {
        const raw = await unlockWithBiometric(kvRef.current!);
        await completeUnlock(raw);
      },
      usePassphraseInstead() {
        setLockMethod("passphrase");
      },
      lock,
      async signOut(force) {
        const eng = engineRef.current;
        if (eng && !force) {
          await eng.push();
          const pending = await eng.pendingCount();
          if (pending > 0) return { pending };
        }
        eng?.stop();
        engineRef.current = null;
        if (user) await destroyDB(user.id);
        await getSupabase()?.auth.signOut();
        window.location.replace(mode === "supabase" ? "/sign-in" : "/");
      },
      async removeDevice() {
        engineRef.current?.stop();
        engineRef.current = null;
        if (user) await destroyDB(user.id);
        if (mode === "supabase") await getSupabase()?.auth.signOut();
        window.location.replace(mode === "supabase" ? "/sign-in" : "/");
      },
      async deleteAccount() {
        if (mode === "supabase") {
          const res = await fetch("/api/account", { method: "DELETE" });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? "Couldn't delete your account.");
          }
        }
        engineRef.current?.stop();
        engineRef.current = null;
        if (user) await destroyDB(user.id);
        clearLegacyData();
        window.location.replace(mode === "supabase" ? "/sign-in" : "/");
      },
      async changePassphrase(current, next) {
        if (!vault) throw new Error("No vault");
        const raw = await unlockWithPassphrase(vault, current);
        try {
          await saveVault(await rewrapPassphrase(vault, raw, next));
        } finally {
          wipe(raw);
        }
      },
      async rotateRecovery(passphrase) {
        if (!vault) throw new Error("No vault");
        const raw = await unlockWithPassphrase(vault, passphrase);
        try {
          const { vault: v, text } = await rotateRecoveryKey(vault, raw);
          await saveVault(v);
          return text;
        } finally {
          wipe(raw);
        }
      },
      async verifyPassphrase(passphrase) {
        if (!vault) return false;
        try {
          wipe(await unlockWithPassphrase(vault, passphrase));
          return true;
        } catch {
          return false;
        }
      },
      async changePin(current, next) {
        const kv = kvRef.current!;
        const result = await unlockWithPin(kv, current);
        if (!result.ok) {
          await refreshLockState();
          return result;
        }
        try {
          await setupPin(kv, next, result.dekRaw);
        } finally {
          wipe(result.dekRaw);
        }
        await refreshLockState();
        return { ok: true as const };
      },
      async setBiometric(on, pin) {
        const kv = kvRef.current!;
        if (!on) {
          await disableBiometric(kv);
        } else {
          if (!pin) throw new Error("Enter your PIN to turn this on.");
          const result = await unlockWithPin(kv, pin);
          if (!result.ok) {
            await refreshLockState();
            throw new Error(result.reason === "wrong" ? `Wrong PIN. ${result.remaining} tries left.` : "Too many tries. Unlock with your passphrase.");
          }
          try {
            await enableBiometric(kv, result.dekRaw, { id: user?.id ?? "local", name: user?.email ?? user?.name ?? "Budget" });
          } finally {
            wipe(result.dekRaw);
          }
        }
        await refreshLockState();
      },
      async signInWithGoogle(next) {
        const supabase = getSupabase();
        if (!supabase) return;
        const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
        await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      },
    }),
    [phase, mode, user, error, lockMethod, pinDigits, pinAttemptsLeft, biometric, recoveryUsed, engine, prefs, vault, completeUnlock, lock, saveVault, refreshLockState],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be used inside SecurityProvider");
  return ctx;
}
