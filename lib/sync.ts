import type { AppData, Settings } from "@/types";
import { decryptJSON, encryptJSON, parseEnvelope, serializeEnvelope } from "@/lib/crypto";
import { META, type BudgetDB } from "@/lib/db";
import type { Remote } from "@/lib/remote";
import {
  SYNC_COLLECTIONS,
  aadFor,
  applyChanges,
  shouldAcceptRemote,
  snapshotChanges,
  validateItem,
  type Change,
  type RecordRow,
} from "@/lib/sync-core";
import { DEFAULT_DATA } from "@/lib/storage";

export type SyncState = "local" | "synced" | "syncing" | "offline" | "error";

export interface SyncStatus {
  state: SyncState;
  pending: number;
  lastSyncedAt?: string;
  error?: string;
  unreadable?: number;
}

interface EngineOptions {
  db: BudgetDB;
  dek: CryptoKey;
  remote: Remote | null;
  onRemote?: (changes: Change[]) => void;
  onStatus?: (status: SyncStatus) => void;
}

const OVERLAP_MS = 5_000;
const BATCH = 400;

export class SyncEngine {
  private db: BudgetDB;
  private dek: CryptoKey;
  private remote: Remote | null;
  private onRemote?: (changes: Change[]) => void;
  private onStatus?: (status: SyncStatus) => void;
  private status: SyncStatus;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pullTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 2_000;
  private unsubscribe: (() => void) | null = null;
  private listeners: (() => void)[] = [];
  private pushing = false;
  private pulling = false;
  private stopped = false;

  constructor(opts: EngineOptions) {
    this.db = opts.db;
    this.dek = opts.dek;
    this.remote = opts.remote;
    this.onRemote = opts.onRemote;
    this.onStatus = opts.onStatus;
    this.status = { state: opts.remote ? "syncing" : "local", pending: 0 };
  }

  setHandlers(h: { onRemote?: (changes: Change[]) => void; onStatus?: (status: SyncStatus) => void }) {
    if (h.onRemote) this.onRemote = h.onRemote;
    if (h.onStatus) {
      this.onStatus = h.onStatus;
      h.onStatus(this.status);
    }
  }

  get isRemote() {
    return Boolean(this.remote);
  }

  getStatus() {
    return this.status;
  }

  private emit(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.onStatus?.(this.status);
  }

  private async encryptChange(c: Change): Promise<RecordRow> {
    const env = await encryptJSON(this.dek, c.deleted ? { deleted: true } : c.item, aadFor(c.collection, c.id));
    return { id: c.id, collection: c.collection, month: c.month, payload: serializeEnvelope(env), updated_at: c.updated_at, deleted: c.deleted };
  }

  private async decryptRow(row: RecordRow): Promise<Change | null> {
    if (row.deleted) return { id: row.id, collection: row.collection, month: row.month, updated_at: row.updated_at, deleted: true };
    try {
      const item = await decryptJSON(this.dek, parseEnvelope(row.payload), aadFor(row.collection, row.id));
      const valid = validateItem(row.collection, item);
      if (!valid) return null;
      return { id: row.id, collection: row.collection, month: row.month, item: valid, updated_at: row.updated_at, deleted: false };
    } catch {
      return null;
    }
  }

  async loadAll(): Promise<AppData> {
    const rows = await this.db.records.toArray();
    const changes: Change[] = [];
    let unreadable = 0;
    for (const row of rows) {
      if (row.deleted) continue;
      const c = await this.decryptRow(row);
      if (c) changes.push(c);
      else unreadable++;
    }
    const empty = { ...DEFAULT_DATA, ...Object.fromEntries(SYNC_COLLECTIONS.map((k) => [k, []])) } as AppData;
    const settings = await this.loadSettings();
    if (unreadable) this.emit({ unreadable });
    return { ...applyChanges(empty, changes), settings };
  }

  async loadSettings(): Promise<Settings> {
    const local = (await this.db.meta.get(META.settings))?.value as Partial<Settings> | undefined;
    return { ...DEFAULT_DATA.settings, ...(local ?? {}) };
  }

  async refreshSettings(): Promise<Settings | null> {
    if (!this.remote) return null;
    try {
      const dirty = (await this.db.meta.get(META.profileDirty))?.value;
      if (dirty) {
        await this.remote.saveProfile(await this.loadSettings());
        await this.db.meta.delete(META.profileDirty);
        return null;
      }
      const remote = await this.remote.getProfile();
      if (!remote) return null;
      const merged = { ...(await this.loadSettings()), ...remote };
      await this.db.meta.put({ key: META.settings, value: merged });
      return merged;
    } catch {
      return null;
    }
  }

  async saveSettings(settings: Settings) {
    await this.db.meta.put({ key: META.settings, value: settings });
    if (!this.remote) return;
    try {
      await this.remote.saveProfile(settings);
    } catch {
      await this.db.meta.put({ key: META.profileDirty, value: true });
    }
  }

  async persist(changes: Change[]) {
    if (!changes.length) return;
    const rows = await Promise.all(changes.map((c) => this.encryptChange(c)));
    await this.db.transaction("rw", this.db.records, this.db.outbox, async () => {
      await this.db.records.bulkPut(rows);
      if (this.remote) await this.db.outbox.bulkPut(rows);
    });
    if (this.remote) {
      this.emit({ pending: await this.db.outbox.count() });
      this.schedulePush(400);
    }
  }

  async importData(data: AppData) {
    await this.persist(snapshotChanges(data));
    await this.saveSettings(data.settings);
  }

  async pendingCount() {
    return this.remote ? this.db.outbox.count() : 0;
  }

  private schedulePush(delay: number) {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), delay);
  }

  private schedulePull(delay = 300) {
    if (this.pullTimer) clearTimeout(this.pullTimer);
    this.pullTimer = setTimeout(() => void this.pull(), delay);
  }

  private online() {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  async push(): Promise<boolean> {
    if (!this.remote || this.pushing || this.stopped) return false;
    if (!this.online()) {
      this.emit({ state: "offline", pending: await this.db.outbox.count() });
      return false;
    }
    this.pushing = true;
    try {
      let batch = await this.db.outbox.orderBy("updated_at").limit(BATCH).toArray();
      while (batch.length) {
        this.emit({ state: "syncing", pending: await this.db.outbox.count() });
        await this.remote.push(batch);
        await this.db.transaction("rw", this.db.outbox, async () => {
          for (const row of batch) {
            const current = await this.db.outbox.get(row.id);
            if (current && current.updated_at === row.updated_at && current.payload === row.payload) await this.db.outbox.delete(row.id);
          }
        });
        batch = await this.db.outbox.orderBy("updated_at").limit(BATCH).toArray();
      }
      this.retryDelay = 2_000;
      this.emit({ state: "synced", pending: 0, error: undefined, lastSyncedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      const pending = await this.db.outbox.count();
      this.emit({ state: this.online() ? "error" : "offline", pending, error: this.online() ? describeError(e) : undefined });
      this.schedulePush(this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, 60_000);
      return false;
    } finally {
      this.pushing = false;
    }
  }

  async pull(): Promise<void> {
    if (!this.remote || this.pulling || this.stopped) return;
    if (!this.online()) {
      this.emit({ state: "offline" });
      return;
    }
    this.pulling = true;
    try {
      const stored = (await this.db.meta.get(META.cursor))?.value as string | undefined;
      let since = stored ? new Date(new Date(stored).getTime() - OVERLAP_MS).toISOString() : null;
      let maxSynced = stored ?? null;
      const changes: Change[] = [];
      let unreadable = 0;
      for (let guard = 0; guard < 100; guard++) {
        const rows = await this.remote.pull(since);
        if (!rows.length) break;
        for (const row of rows) {
          if (!maxSynced || row.synced_at > maxSynced) maxSynced = row.synced_at;
          const local = await this.db.records.get(row.id);
          if (local && local.payload === row.payload && local.deleted === row.deleted) continue;
          const pending = Boolean(await this.db.outbox.get(row.id));
          if (!shouldAcceptRemote(local, row, pending)) continue;
          const change = await this.decryptRow(row);
          if (!change) {
            unreadable++;
            continue;
          }
          const { synced_at: _s, ...plain } = row;
          void _s;
          await this.db.records.put(plain);
          changes.push(change);
        }
        if (rows.length < 1000) break;
        since = rows[rows.length - 1].synced_at;
      }
      if (maxSynced) await this.db.meta.put({ key: META.cursor, value: maxSynced });
      if (changes.length) this.onRemote?.(changes);
      const pendingCount = await this.db.outbox.count();
      this.emit({
        state: pendingCount ? "syncing" : "synced",
        pending: pendingCount,
        lastSyncedAt: new Date().toISOString(),
        error: undefined,
        unreadable: unreadable || this.status.unreadable,
      });
    } catch (e) {
      this.emit({ state: this.online() ? "error" : "offline", error: this.online() ? describeError(e) : undefined });
    } finally {
      this.pulling = false;
    }
  }

  async sync() {
    await this.push();
    await this.pull();
  }

  start() {
    this.stopped = false;
    if (!this.remote || typeof window === "undefined") return;
    void (async () => {
      this.emit({ pending: await this.db.outbox.count() });
      await this.sync();
    })();
    this.unsubscribe = this.remote.subscribe(() => this.schedulePull(500));
    const onOnline = () => void this.sync();
    const onOffline = () => this.emit({ state: "offline" });
    const onFocus = () => this.schedulePull(200);
    const onVisible = () => {
      if (document.visibilityState === "visible") this.schedulePull(200);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    this.listeners.push(
      () => window.removeEventListener("online", onOnline),
      () => window.removeEventListener("offline", onOffline),
      () => window.removeEventListener("focus", onFocus),
      () => document.removeEventListener("visibilitychange", onVisible),
    );
  }

  stop() {
    this.stopped = true;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.pullTimer) clearTimeout(this.pullTimer);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeners.forEach((off) => off());
    this.listeners = [];
  }
}

function describeError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    const msg = (e as { message: string }).message;
    if (/fetch|network/i.test(msg)) return "Can't reach the server right now.";
    if (/jwt|auth|401|403/i.test(msg)) return "Your session expired. Sign in again to keep syncing.";
    return "Something went wrong while syncing. We'll keep retrying.";
  }
  return "Something went wrong while syncing. We'll keep retrying.";
}
