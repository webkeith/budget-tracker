import { z } from "zod";
import type { AppData } from "@/types";

export const SYNC_COLLECTIONS = [
  "clients",
  "incomes",
  "payables",
  "responsibilities",
  "expenses",
  "savings",
  "investments",
  "wishlist",
  "assets",
  "netWorthHistory",
] as const;

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export interface RecordRow {
  id: string;
  collection: SyncCollection;
  month: string | null;
  payload: string;
  updated_at: string;
  deleted: boolean;
}

export interface Change {
  id: string;
  collection: SyncCollection;
  month: string | null;
  item?: Record<string, unknown>;
  updated_at: string;
  deleted: boolean;
}

type AnyItem = Record<string, unknown>;

export function itemId(collection: SyncCollection, item: AnyItem): string {
  if (collection === "netWorthHistory") return `nw-${String(item.month)}`;
  return String(item.id);
}

export function itemMonth(collection: SyncCollection, item: AnyItem): string | null {
  return typeof item.month === "string" && ["incomes", "payables", "responsibilities", "expenses", "netWorthHistory"].includes(collection)
    ? (item.month as string)
    : null;
}

export function aadFor(collection: SyncCollection, id: string) {
  return `budget:record:${collection}:${id}`;
}

function indexed(collection: SyncCollection, list: unknown[]): Map<string, AnyItem> {
  const map = new Map<string, AnyItem>();
  for (const item of list as AnyItem[]) map.set(itemId(collection, item), item);
  return map;
}

export function diffData(prev: AppData, next: AppData, now = new Date().toISOString()): Change[] {
  const changes: Change[] = [];
  for (const collection of SYNC_COLLECTIONS) {
    const a = prev[collection] as unknown[];
    const b = next[collection] as unknown[];
    if (a === b) continue;
    const before = indexed(collection, a);
    const after = indexed(collection, b);
    for (const [id, item] of after) {
      const old = before.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        changes.push({ id, collection, month: itemMonth(collection, item), item, updated_at: now, deleted: false });
      }
    }
    for (const [id, item] of before) {
      if (!after.has(id)) changes.push({ id, collection, month: itemMonth(collection, item), updated_at: now, deleted: true });
    }
  }
  return changes;
}

export function snapshotChanges(data: AppData, now = new Date().toISOString()): Change[] {
  const empty = Object.fromEntries(SYNC_COLLECTIONS.map((c) => [c, []])) as unknown as AppData;
  return diffData({ ...data, ...empty }, data, now);
}

export function applyChanges(data: AppData, changes: Change[]): AppData {
  if (!changes.length) return data;
  const next: AppData = { ...data };
  const grouped = new Map<SyncCollection, Change[]>();
  for (const c of changes) grouped.set(c.collection, [...(grouped.get(c.collection) ?? []), c]);
  for (const [collection, list] of grouped) {
    const map = indexed(collection, data[collection] as unknown[]);
    for (const c of list) {
      if (c.deleted || !c.item) map.delete(c.id);
      else map.set(c.id, c.item);
    }
    (next as unknown as Record<string, unknown>)[collection] = Array.from(map.values());
  }
  return next;
}

export function shouldAcceptRemote(local: Pick<RecordRow, "updated_at"> | undefined, remote: Pick<RecordRow, "updated_at">, pendingLocal: boolean): boolean {
  if (!local) return true;
  if (pendingLocal && local.updated_at >= remote.updated_at) return false;
  return remote.updated_at >= local.updated_at;
}

const money = z.number().finite();
const iso = z.string();

const base = z.object({ id: z.string().min(1) }).loose();

export const SCHEMAS: Record<SyncCollection, z.ZodType<AnyItem>> = {
  clients: base.extend({ name: z.string(), payType: z.enum(["fixed", "variable"]), schedule: z.object({ kind: z.string() }).loose(), rates: z.array(z.object({ amount: money, from: iso })), periods: z.array(z.object({ start: iso }).loose()), status: z.enum(["active", "paused", "terminated"]) }),
  incomes: base.extend({ month: z.string(), name: z.string(), amount: money }),
  payables: base.extend({ month: z.string(), name: z.string(), amount: money, dueDay: z.number() }),
  responsibilities: base.extend({ month: z.string(), name: z.string(), amount: money }),
  expenses: base.extend({ month: z.string(), name: z.string(), amount: money }),
  savings: base.extend({ name: z.string(), target: money, current: money }),
  investments: base.extend({ name: z.string(), invested: money, currentValue: money }),
  wishlist: base.extend({ name: z.string(), price: money }),
  assets: base.extend({ name: z.string(), value: money }),
  netWorthHistory: z.object({ month: z.string(), value: money }).loose(),
};

export function validateItem(collection: SyncCollection, item: unknown): AnyItem | null {
  const result = SCHEMAS[collection].safeParse(item);
  return result.success ? result.data : null;
}
