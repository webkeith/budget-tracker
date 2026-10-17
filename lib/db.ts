import Dexie, { type Table } from "dexie";
import type { RecordRow } from "@/lib/sync-core";
import type { KV } from "@/lib/pin";

export interface MetaRow {
  key: string;
  value: unknown;
}

export class BudgetDB extends Dexie {
  records!: Table<RecordRow, string>;
  outbox!: Table<RecordRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(userId: string) {
    super(`budget-tracker:${userId}`);
    this.version(1).stores({
      records: "id, collection, month, updated_at",
      outbox: "id, updated_at",
      meta: "key",
    });
  }
}

const cache = new Map<string, BudgetDB>();

export function openDB(userId: string): BudgetDB {
  let db = cache.get(userId);
  if (!db) {
    db = new BudgetDB(userId);
    cache.set(userId, db);
  }
  return db;
}

export async function destroyDB(userId: string): Promise<void> {
  const db = cache.get(userId) ?? new BudgetDB(userId);
  cache.delete(userId);
  db.close();
  await Dexie.delete(db.name);
}

export function kvFor(db: BudgetDB): KV {
  return {
    async get<T>(key: string) {
      return (await db.meta.get(key))?.value as T | undefined;
    },
    async set(key, value) {
      await db.meta.put({ key, value });
    },
    async del(key) {
      await db.meta.delete(key);
    },
  };
}

export const META = {
  vault: "vault",
  settings: "settings",
  cursor: "pullCursor",
  bio: "biometricWrapper",
  profileDirty: "profileDirty",
} as const;
