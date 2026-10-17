import type { AppData } from "@/types";

export interface StorageAdapter {
  load(key?: string): Promise<AppData | null>;
  save(data: AppData, key?: string): Promise<void>;
  remove(key?: string): Promise<void>;
}

export const STORAGE_KEY = "budget-tracker:data:v1";
export const BACKUP_KEY = "budget-tracker:backup:v1";
export const SAMPLE_FLAG_KEY = "budget-tracker:sample-mode";

export const DEFAULT_DATA: AppData = {
  version: 1,
  settings: { currency: "PHP", locale: "en-PH", startDay: 1 },
  clients: [],
  incomes: [],
  payables: [],
  responsibilities: [],
  expenses: [],
  savings: [],
  investments: [],
  wishlist: [],
  assets: [],
  netWorthHistory: [],
};

export function normalize(input: unknown): AppData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<AppData>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    version: 1,
    settings: {
      ...DEFAULT_DATA.settings,
      ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}),
    },
    clients: arr(raw.clients),
    incomes: arr(raw.incomes),
    payables: arr(raw.payables),
    responsibilities: arr(raw.responsibilities),
    expenses: arr(raw.expenses),
    savings: arr(raw.savings),
    investments: arr(raw.investments),
    wishlist: arr(raw.wishlist),
    assets: arr(raw.assets),
    netWorthHistory: arr(raw.netWorthHistory),
  };
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const ls = window.localStorage;
    const probe = "__bt_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export const localStorageAdapter: StorageAdapter = {
  async load(key = STORAGE_KEY) {
    const ls = safeLocalStorage();
    if (!ls) return null;
    const raw = ls.getItem(key);
    if (!raw) return null;
    try {
      return normalize(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  async save(data, key = STORAGE_KEY) {
    const ls = safeLocalStorage();
    if (!ls) return;
    try {
      ls.setItem(key, JSON.stringify(data));
    } catch {
      /* quota or private mode */
    }
  },
  async remove(key = STORAGE_KEY) {
    safeLocalStorage()?.removeItem(key);
  },
};

export const storage: StorageAdapter = localStorageAdapter;

export function getFlag(key: string): boolean {
  return safeLocalStorage()?.getItem(key) === "1";
}

export function setFlag(key: string, value: boolean) {
  const ls = safeLocalStorage();
  if (!ls) return;
  if (value) ls.setItem(key, "1");
  else ls.removeItem(key);
}

export function exportJSON(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(text: string): AppData {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("That file doesn't look like a backup.");
  return normalize(parsed);
}
