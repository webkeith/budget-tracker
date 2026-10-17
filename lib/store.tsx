"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, CollectionKey, ModuleKey, MonthKey, Payout, Settings } from "@/types";
import { DEFAULT_DATA, SAMPLE_FLAG_KEY, getFlag, setFlag } from "@/lib/storage";
import { createSeedData } from "@/lib/seed";
import { copyRecurringToMonth, recordNetWorth } from "@/lib/calculations";
import { addMonths, currentBudgetMonth, uid, CURRENCIES } from "@/lib/format";
import { applyChanges, diffData } from "@/lib/sync-core";
import type { SyncEngine, SyncStatus } from "@/lib/sync";

type Item<K extends CollectionKey> = AppData[K][number];

export interface EditorState {
  module: ModuleKey;
  item?: { id: string } & Record<string, unknown>;
  preset?: Record<string, unknown>;
}

export type ClientSheetState =
  | { kind: "detail"; clientId: string }
  | { kind: "log"; clientId: string; payout: Payout }
  | { kind: "payout"; clientId: string; payout: Payout }
  | { kind: "terminate"; clientId: string }
  | { kind: "reactivate"; clientId: string };

export interface Toast {
  id: string;
  message: string;
  tone?: "default" | "success" | "warning";
}

interface StoreValue {
  ready: boolean;
  data: AppData;
  month: MonthKey;
  currentMonth: MonthKey;
  sampleMode: boolean;
  syncStatus: SyncStatus;
  setMonth: (m: MonthKey) => void;
  upsert: <K extends CollectionKey>(key: K, item: Item<K>) => void;
  remove: (key: CollectionKey, id: string) => void;
  patch: <K extends CollectionKey>(key: K, id: string, changes: Partial<Item<K>>) => void;
  mutate: (updater: (d: AppData) => AppData) => void;
  updateSettings: (s: Partial<Settings>) => void;
  replaceData: (d: AppData) => Promise<void>;
  resetData: () => Promise<void>;
  setSampleMode: (on: boolean) => Promise<void>;
  copyToNextMonth: () => number;
  syncNow: () => void;
  editor: EditorState | null;
  openEditor: (e: EditorState) => void;
  closeEditor: () => void;
  clientSheet: ClientSheetState | null;
  openClientSheet: (s: ClientSheetState) => void;
  closeClientSheet: () => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children, engine }: { children: ReactNode; engine: SyncEngine | null }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [sampleMode, setSample] = useState(false);
  const [month, setMonth] = useState<MonthKey>(() => currentBudgetMonth(1));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [clientSheet, setClientSheet] = useState<ClientSheetState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: engine?.isRemote ? "syncing" : "local", pending: 0 });
  const dataRef = useRef<AppData>(DEFAULT_DATA);
  const sampleRef = useRef(false);

  const currentMonth = currentBudgetMonth(data.settings.startDay);

  const setBoth = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sample = getFlag(SAMPLE_FLAG_KEY);
      let initial: AppData;
      if (engine) {
        const loaded = await engine.loadAll();
        initial = sample ? { ...createSeedData(), settings: loaded.settings } : loaded;
      } else {
        initial = createSeedData();
      }
      if (cancelled) return;
      sampleRef.current = sample || !engine;
      setSample(sample || !engine);
      setBoth(initial);
      setMonth(currentBudgetMonth(initial.settings.startDay));
      setReady(true);
      if (engine) {
        engine.setHandlers({
          onRemote: (changes) => {
            if (sampleRef.current) return;
            setBoth(applyChanges(dataRef.current, changes));
          },
          onStatus: setSyncStatus,
        });
        engine.start();
        const remoteSettings = await engine.refreshSettings();
        if (remoteSettings && !cancelled) setBoth({ ...dataRef.current, settings: remoteSettings });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engine, setBoth]);

  const commit = useCallback(
    (updater: (d: AppData) => AppData) => {
      const prev = dataRef.current;
      const next = recordNetWorth(updater(prev), currentBudgetMonth(prev.settings.startDay));
      setBoth(next);
      if (engine && !sampleRef.current) {
        const changes = diffData(prev, next);
        if (changes.length) void engine.persist(changes);
        if (prev.settings !== next.settings) void engine.saveSettings(next.settings);
      }
    },
    [engine, setBoth],
  );

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const upsert = useCallback(
    <K extends CollectionKey>(key: K, item: Item<K>) => {
      commit((d) => {
        const list = d[key] as Item<K>[];
        const exists = list.some((x) => x.id === item.id);
        const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
        return { ...d, [key]: next };
      });
    },
    [commit],
  );

  const patch = useCallback(
    <K extends CollectionKey>(key: K, id: string, changes: Partial<Item<K>>) => {
      commit((d) => ({
        ...d,
        [key]: (d[key] as Item<K>[]).map((x) => (x.id === id ? { ...x, ...changes } : x)),
      }));
    },
    [commit],
  );

  const remove = useCallback(
    (key: CollectionKey, id: string) => {
      commit((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
    },
    [commit],
  );

  const updateSettings = useCallback(
    (s: Partial<Settings>) => {
      commit((d) => {
        const settings = { ...d.settings, ...s };
        if (s.currency) settings.locale = CURRENCIES.find((c) => c.code === s.currency)?.locale ?? "en-US";
        return { ...d, settings };
      });
    },
    [commit],
  );

  const replaceData = useCallback(
    async (next: AppData) => {
      if (sampleRef.current) {
        sampleRef.current = false;
        setSample(false);
        setFlag(SAMPLE_FLAG_KEY, false);
        if (engine) setBoth(await engine.loadAll());
      }
      commit(() => next);
    },
    [commit, engine, setBoth],
  );

  const resetData = useCallback(async () => {
    sampleRef.current = false;
    setSample(false);
    setFlag(SAMPLE_FLAG_KEY, false);
    if (engine) setBoth(await engine.loadAll());
    commit((d) => ({ ...DEFAULT_DATA, settings: d.settings }));
  }, [commit, engine, setBoth]);

  const setSampleMode = useCallback(
    async (on: boolean) => {
      if (!engine) return;
      setFlag(SAMPLE_FLAG_KEY, on);
      sampleRef.current = on;
      setSample(on);
      if (on) {
        const seed = createSeedData();
        setBoth({ ...seed, settings: dataRef.current.settings });
      } else {
        setBoth(await engine.loadAll());
        void engine.pull();
      }
    },
    [engine, setBoth],
  );

  const copyToNextMonth = useCallback(() => {
    const to = addMonths(month, 1);
    const result = copyRecurringToMonth(dataRef.current, month, to, uid);
    if (result.copied > 0) commit(() => result.data);
    return result.copied;
  }, [commit, month]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      data,
      month,
      currentMonth,
      sampleMode,
      syncStatus,
      setMonth,
      upsert,
      remove,
      patch,
      mutate: commit,
      updateSettings,
      replaceData,
      resetData,
      setSampleMode,
      copyToNextMonth,
      syncNow: () => void engine?.sync(),
      editor,
      openEditor: (e) => {
        setQuickAddOpen(false);
        setEditor(e);
      },
      closeEditor: () => setEditor(null),
      clientSheet,
      openClientSheet: (c) => {
        setQuickAddOpen(false);
        setClientSheet(c);
      },
      closeClientSheet: () => setClientSheet(null),
      quickAddOpen,
      setQuickAddOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [ready, data, month, currentMonth, sampleMode, syncStatus, upsert, remove, patch, commit, updateSettings, replaceData, resetData, setSampleMode, copyToNextMonth, engine, editor, clientSheet, quickAddOpen, toasts, toast, dismissToast],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useMoney() {
  const ctx = useContext(StoreContext);
  const currency = ctx?.data.settings.currency ?? "PHP";
  const locale = ctx?.data.settings.locale ?? "en-PH";
  return useMemo(() => ({ currency, locale }), [currency, locale]);
}

