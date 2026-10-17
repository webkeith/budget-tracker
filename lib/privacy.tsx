"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface PrivacyPrefs {
  hideOnLaunch: boolean;
  hidePercentages: boolean;
  blurOnBackground: boolean;
}

interface PrivacyValue {
  hidden: boolean;
  hidePercent: boolean;
  backgrounded: boolean;
  prefs: PrivacyPrefs;
  toggle: () => void;
  setHidden: (v: boolean) => void;
  setPrefs: (p: Partial<PrivacyPrefs>) => void;
}

const KEY = "budget-tracker:privacy";
const DEFAULTS: PrivacyPrefs = { hideOnLaunch: false, hidePercentages: false, blurOnBackground: true };

function read(): PrivacyPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const PrivacyContext = createContext<PrivacyValue>({
  hidden: false,
  hidePercent: false,
  backgrounded: false,
  prefs: DEFAULTS,
  toggle: () => {},
  setHidden: () => {},
  setPrefs: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<PrivacyPrefs>(DEFAULTS);
  const [hidden, setHidden] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);

  useEffect(() => {
    const p = read();
    setPrefsState(p);
    setHidden(p.hideOnLaunch);
  }, []);

  const toggle = useCallback(() => setHidden((h) => !h), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    if (!prefs.blurOnBackground) {
      setBackgrounded(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "hidden") setBackgrounded(true);
      else timer = setTimeout(() => setBackgrounded(false), 180);
    };
    const onPageHide = () => setBackgrounded(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [prefs.blurOnBackground]);

  const setPrefs = useCallback((p: Partial<PrivacyPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<PrivacyValue>(
    () => ({ hidden, hidePercent: hidden && prefs.hidePercentages, backgrounded, prefs, toggle, setHidden, setPrefs }),
    [hidden, prefs, backgrounded, toggle, setPrefs],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export const MASK = "••••••";
