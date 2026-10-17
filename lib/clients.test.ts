import { describe, expect, it } from "vitest";
import {
  allPayoutsForMonth,
  clientAveragePayout,
  clientPayoutsForMonth,
  materializePayout,
  overdueFixedPayouts,
  pauseClient,
  paydaysInMonth,
  pendingVariablePayouts,
  periodStartFor,
  reactivateClient,
  terminateClient,
} from "@/lib/clients";
import { expectedIncome, receivedIncome, totalIncome, copyRecurringToMonth } from "@/lib/calculations";
import { DEFAULT_DATA } from "@/lib/storage";
import type { AppData, Client } from "@/types";

const fixed: Client = {
  id: "c1",
  name: "Acme",
  color: "#fff",
  payType: "fixed",
  schedule: { kind: "semimonthly", day1: 15, day2: "last" },
  rates: [{ amount: 12500, from: "2026-01-01" }],
  periods: [{ start: "2026-01-01" }],
  status: "active",
  trackFrom: "2026-01-01",
  backfill: false,
};

const hourly: Client = {
  id: "c2",
  name: "Northwind",
  color: "#000",
  payType: "variable",
  schedule: { kind: "weekly", weekday: 5 },
  rates: [],
  hourlyRate: 650,
  periods: [{ start: "2026-09-01" }],
  status: "active",
  trackFrom: "2026-09-01",
  backfill: false,
};

const today = new Date(2026, 9, 17);

describe("paydays", () => {
  it("counts weekly paydays including 5-week months", () => {
    expect(paydaysInMonth({ kind: "weekly", weekday: 5 }, "2026-10")).toEqual(["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]);
    expect(paydaysInMonth({ kind: "weekly", weekday: 5 }, "2026-11")).toHaveLength(4);
  });

  it("handles every-2-weeks from an anchor, before and after it", () => {
    expect(paydaysInMonth({ kind: "biweekly", anchor: "2026-10-02" }, "2026-10")).toEqual(["2026-10-02", "2026-10-16", "2026-10-30"]);
    expect(paydaysInMonth({ kind: "biweekly", anchor: "2026-10-02" }, "2026-09")).toEqual(["2026-09-04", "2026-09-18"]);
  });

  it("handles twice-a-month and monthly with short months", () => {
    expect(paydaysInMonth({ kind: "semimonthly", day1: 15, day2: "last" }, "2027-02")).toEqual(["2027-02-15", "2027-02-28"]);
    expect(paydaysInMonth({ kind: "semimonthly", day1: 15, day2: 30 }, "2027-02")).toEqual(["2027-02-15", "2027-02-28"]);
    expect(paydaysInMonth({ kind: "monthly", day: 31 }, "2026-11")).toEqual(["2026-11-30"]);
    expect(paydaysInMonth({ kind: "monthly", day: "last" }, "2028-02")).toEqual(["2028-02-29"]);
  });

  it("computes periods", () => {
    expect(periodStartFor({ kind: "weekly", weekday: 5 }, "2026-10-16")).toBe("2026-10-10");
    expect(periodStartFor({ kind: "semimonthly", day1: 15, day2: "last" }, "2026-10-15")).toBe("2026-10-01");
    expect(periodStartFor({ kind: "semimonthly", day1: 15, day2: "last" }, "2026-10-31")).toBe("2026-10-16");
    expect(periodStartFor({ kind: "monthly", day: 5 }, "2026-10-05")).toBe("2026-09-06");
  });
});

describe("payouts", () => {
  const data: AppData = { ...DEFAULT_DATA, clients: [fixed, hourly] };

  it("splits expected vs received and ignores variable placeholders", () => {
    const received = materializePayout(clientPayoutsForMonth(fixed, "2026-10", [])[0], { status: "received", dateReceived: "2026-10-15" }, () => "r1");
    const logged = materializePayout(clientPayoutsForMonth(hourly, "2026-10", [])[0], { status: "received", amount: 5200, hours: 8 }, () => "r2");
    const skipped = materializePayout(clientPayoutsForMonth(hourly, "2026-10", [])[1], { status: "skipped", amount: 0 }, () => "r3");
    const d: AppData = { ...data, incomes: [received, logged, skipped, { id: "s", month: "2026-10", name: "Salary", type: "salary", amount: 30000, frequency: "bimonthly" }] };
    expect(receivedIncome(d, "2026-10")).toBe(12500 + 5200 + 60000);
    expect(expectedIncome(d, "2026-10")).toBe(12500);
    expect(totalIncome(d, "2026-10")).toBe(90200);
    const payouts = allPayoutsForMonth(d, "2026-10");
    expect(payouts.filter((p) => p.clientId === "c2").map((p) => p.status)).toEqual(["received", "skipped", "needs-amount", "needs-amount", "needs-amount"]);
    expect(pendingVariablePayouts(d, today).map((p) => p.periodEnd)).toEqual([
      "2026-09-18",
      "2026-09-25",
      "2026-10-16",
    ]);
    expect(clientAveragePayout(d, hourly, "2026-10")).toBe(5200);
  });

  it("is idempotent: materialized payouts replace their placeholder", () => {
    const p = clientPayoutsForMonth(fixed, "2026-10", [])[0];
    const stored = materializePayout(p, { status: "received" }, () => "x");
    const again = clientPayoutsForMonth(fixed, "2026-10", [stored]);
    expect(again).toHaveLength(2);
    expect(again.filter((q) => !q.virtual)).toHaveLength(1);
  });

  it("flags overdue fixed payouts", () => {
    expect(overdueFixedPayouts(data, "2026-10", today).map((p) => p.periodEnd)).toEqual(["2026-10-15"]);
  });

  it("only backfills fixed clients when asked", () => {
    const late = { ...fixed, trackFrom: "2026-10-20" };
    expect(clientPayoutsForMonth(late, "2026-10", []).map((p) => p.periodEnd)).toEqual(["2026-10-31"]);
    const backfilled = clientPayoutsForMonth({ ...late, backfill: true }, "2026-10", []);
    expect(backfilled.map((p) => p.status)).toEqual(["received", "expected"]);
  });

  it("applies rate changes from their effective date", () => {
    const raised = { ...fixed, rates: [...fixed.rates, { amount: 15000, from: "2026-10-20" }] };
    expect(clientPayoutsForMonth(raised, "2026-10", []).map((p) => p.amount)).toEqual([12500, 15000]);
  });

  it("does not copy client payouts to the next month", () => {
    const stored = materializePayout(clientPayoutsForMonth(fixed, "2026-10", [])[0], { status: "received" }, () => "x");
    const { copied } = copyRecurringToMonth({ ...data, incomes: [stored] }, "2026-10", "2026-11", () => "y");
    expect(copied).toBe(0);
  });
});

describe("lifecycle", () => {
  const received = materializePayout(clientPayoutsForMonth(fixed, "2026-09", [])[0], { status: "received" }, () => "hist");

  it("terminate stops future payouts and keeps history", () => {
    const res = terminateClient({ incomes: [received] }, fixed, { endDate: "2026-10-16", reason: "contract-ended", keepUnreceived: false }, () => "k");
    expect(res.client.status).toBe("terminated");
    expect(clientPayoutsForMonth(res.client, "2026-10", [received]).map((p) => p.periodEnd)).toEqual(["2026-10-15"]);
    expect(clientPayoutsForMonth(res.client, "2026-11", [received])).toHaveLength(0);
    expect(clientPayoutsForMonth(res.client, "2026-09", [received]).some((p) => p.id === "hist")).toBe(true);
  });

  it("terminate can keep the final unreceived payout", () => {
    const res = terminateClient({ incomes: [] }, fixed, { endDate: "2026-10-16", keepUnreceived: true }, () => "kept");
    expect(res.upserts.map((u) => u.periodEnd)).toEqual(["2026-10-31"]);
    expect(clientPayoutsForMonth(res.client, "2026-10", res.upserts).map((p) => p.periodEnd)).toEqual(["2026-10-15", "2026-10-31"]);
  });

  it("terminate can remove stored unreceived payouts after the end date", () => {
    const kept = materializePayout(clientPayoutsForMonth(fixed, "2026-10", [])[1], {}, () => "late");
    const res = terminateClient({ incomes: [kept] }, fixed, { endDate: "2026-10-16", keepUnreceived: false }, () => "z");
    expect(res.removeIds).toEqual(["late"]);
  });

  it("pause and reactivate", () => {
    const paused = pauseClient(fixed, "2026-10-01");
    expect(clientPayoutsForMonth(paused, "2026-10", [])).toHaveLength(0);
    const back = reactivateClient(paused, "2026-10-20");
    expect(back.status).toBe("active");
    expect(clientPayoutsForMonth(back, "2026-10", []).map((p) => p.periodEnd)).toEqual(["2026-10-31"]);
    expect(clientPayoutsForMonth(back, "2026-09", []).length).toBe(2);
  });
});

describe("next payout to log", async () => {
  const { nextPayoutToLog } = await import("@/lib/clients");
  it("prefers the oldest pending payout, then the upcoming one", () => {
    const p = nextPayoutToLog({ incomes: [] }, hourly, today);
    expect(p?.periodEnd).toBe("2026-09-18");
    const fixedNext = nextPayoutToLog({ incomes: [] }, { ...fixed, trackFrom: "2026-10-16" }, today);
    expect(fixedNext?.periodEnd).toBe("2026-10-31");
  });
});
