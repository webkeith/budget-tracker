import { describe, expect, it } from "vitest";
import { applyChanges, diffData, shouldAcceptRemote, snapshotChanges, validateItem } from "@/lib/sync-core";
import { DEFAULT_DATA } from "@/lib/storage";
import type { AppData } from "@/types";

const base: AppData = {
  ...DEFAULT_DATA,
  incomes: [{ id: "i1", month: "2026-10", name: "Salary", type: "salary", amount: 100, frequency: "monthly" }],
  assets: [{ id: "a1", name: "Car", type: "vehicle", value: 500 }],
  netWorthHistory: [{ month: "2026-09", value: 10 }],
};

describe("sync core", () => {
  it("diffs adds, edits, and deletes", () => {
    const next: AppData = {
      ...base,
      incomes: [{ ...base.incomes[0], amount: 200 }],
      assets: [],
      savings: [{ id: "s1", name: "EF", isEmergency: true, target: 1, current: 0, monthlyContribution: 0 }],
    };
    const changes = diffData(base, next, "2026-10-17T00:00:00.000Z");
    expect(changes.map((c) => `${c.collection}:${c.id}:${c.deleted}`).sort()).toEqual(["assets:a1:true", "incomes:i1:false", "savings:s1:false"]);
    expect(changes.find((c) => c.id === "i1")?.month).toBe("2026-10");
  });

  it("produces no changes for identical data", () => {
    expect(diffData(base, { ...base, incomes: [...base.incomes] })).toHaveLength(0);
  });

  it("applies remote changes including deletes", () => {
    const merged = applyChanges(base, [
      { id: "a1", collection: "assets", month: null, updated_at: "x", deleted: true },
      { id: "nw-2026-10", collection: "netWorthHistory", month: "2026-10", item: { month: "2026-10", value: 20 }, updated_at: "x", deleted: false },
      { id: "i1", collection: "incomes", month: "2026-10", item: { ...base.incomes[0], amount: 999 }, updated_at: "x", deleted: false },
    ]);
    expect(merged.assets).toHaveLength(0);
    expect(merged.netWorthHistory).toHaveLength(2);
    expect(merged.incomes[0].amount).toBe(999);
  });

  it("round-trips through snapshot + apply", () => {
    const changes = snapshotChanges(base);
    const rebuilt = applyChanges({ ...DEFAULT_DATA }, changes);
    expect(rebuilt.incomes).toEqual(base.incomes);
    expect(rebuilt.netWorthHistory).toEqual(base.netWorthHistory);
  });

  it("resolves conflicts with last write wins", () => {
    expect(shouldAcceptRemote(undefined, { updated_at: "2026-01-01" }, false)).toBe(true);
    expect(shouldAcceptRemote({ updated_at: "2026-01-02" }, { updated_at: "2026-01-01" }, false)).toBe(false);
    expect(shouldAcceptRemote({ updated_at: "2026-01-01" }, { updated_at: "2026-01-02" }, false)).toBe(true);
    expect(shouldAcceptRemote({ updated_at: "2026-01-02" }, { updated_at: "2026-01-02" }, true)).toBe(false);
  });

  it("validates decrypted payloads", () => {
    expect(validateItem("assets", { id: "a", name: "x", value: 1, extra: true })).toMatchObject({ extra: true });
    expect(validateItem("assets", { id: "a", name: "x", value: "1" })).toBeNull();
  });
});
