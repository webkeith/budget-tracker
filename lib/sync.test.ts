import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BudgetDB } from "@/lib/db";
import { SyncEngine } from "@/lib/sync";
import type { PulledRow, Remote } from "@/lib/remote";
import type { RecordRow } from "@/lib/sync-core";
import { applyChanges, diffData } from "@/lib/sync-core";
import { importAesKey, randomBytes } from "@/lib/crypto";
import { DEFAULT_DATA } from "@/lib/storage";
import type { AppData } from "@/types";

function fakeServer() {
  const rows = new Map<string, PulledRow>();
  let clock = 0;
  const remote: Remote = {
    async getVault() {
      return null;
    },
    async saveVault() {},
    async getProfile() {
      return null;
    },
    async saveProfile() {},
    async pull(since) {
      return [...rows.values()].filter((r) => !since || r.synced_at > since).sort((a, b) => a.synced_at.localeCompare(b.synced_at));
    },
    async push(batch: RecordRow[]) {
      for (const r of batch) {
        const existing = rows.get(r.id);
        if (existing && existing.updated_at > r.updated_at) continue;
        clock++;
        rows.set(r.id, { ...r, synced_at: new Date(Date.UTC(2030, 0, 1, 0, 0, clock)).toISOString() });
      }
    },
    subscribe() {
      return () => {};
    },
  };
  return { remote, rows };
}

let n = 0;
async function device(remote: Remote, dek: CryptoKey) {
  const db = new BudgetDB(`test-${n++}`);
  let data: AppData = { ...DEFAULT_DATA };
  const engine = new SyncEngine({ db, dek, remote, onRemote: (c) => (data = applyChanges(data, c)) });
  return {
    engine,
    get data() {
      return data;
    },
    async edit(update: (d: AppData) => AppData, at: string) {
      const next = update(data);
      await engine.persist(diffData(data, next, at));
      data = next;
    },
  };
}

describe("sync engine", () => {
  it("syncs encrypted records between devices with LWW and deletes", async () => {
    const { remote, rows } = fakeServer();
    const dek = await importAesKey(randomBytes(32));
    const a = await device(remote, dek);
    const b = await device(remote, dek);

    await a.edit((d) => ({ ...d, assets: [{ id: "x", name: "Laptop", type: "gadget", value: 90000 }] }), "2026-10-17T01:00:00.000Z");
    await a.engine.push();
    expect([...rows.values()][0].payload).not.toContain("Laptop");

    await b.engine.pull();
    expect(b.data.assets[0]).toMatchObject({ name: "Laptop", value: 90000 });

    await b.edit((d) => ({ ...d, assets: [{ ...d.assets[0], value: 80000 }] }), "2026-10-17T03:00:00.000Z");
    await a.edit((d) => ({ ...d, assets: [{ ...d.assets[0], value: 85000 }] }), "2026-10-17T02:00:00.000Z");
    await b.engine.push();
    await a.engine.push();
    await a.engine.pull();
    await b.engine.pull();
    expect(a.data.assets[0].value).toBe(80000);
    expect(b.data.assets[0].value).toBe(80000);

    await a.edit((d) => ({ ...d, assets: [] }), "2026-10-17T04:00:00.000Z");
    await a.engine.push();
    await b.engine.pull();
    expect(b.data.assets).toHaveLength(0);

    const reloaded = await b.engine.loadAll();
    expect(reloaded.assets).toHaveLength(0);
  });

  it("keeps offline edits queued until push succeeds", async () => {
    const { remote, rows } = fakeServer();
    const dek = await importAesKey(randomBytes(32));
    const failing: Remote = { ...remote, push: async () => Promise.reject(new Error("network down")) };
    const a = await device(failing, dek);
    await a.edit((d) => ({ ...d, wishlist: [{ id: "w", name: "Desk", price: 1, priority: "need", setAside: 0 }] }), "2026-10-17T01:00:00.000Z");
    expect(await a.engine.push()).toBe(false);
    a.engine.stop();
    expect(await a.engine.pendingCount()).toBe(1);
    expect(rows.size).toBe(0);
  });

  it("skips rows encrypted with another key", async () => {
    const { remote } = fakeServer();
    const a = await device(remote, await importAesKey(randomBytes(32)));
    const b = await device(remote, await importAesKey(randomBytes(32)));
    await a.edit((d) => ({ ...d, assets: [{ id: "x", name: "Car", type: "vehicle", value: 1 }] }), "2026-10-17T01:00:00.000Z");
    await a.engine.push();
    await b.engine.pull();
    expect(b.data.assets).toHaveLength(0);
    expect(b.engine.getStatus().unreadable).toBe(1);
  });
});
