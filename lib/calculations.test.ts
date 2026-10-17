import { describe, expect, it } from "vitest";
import {
  affordability,
  copyRecurringToMonth,
  effectiveStatus,
  incomeMonthlyAmount,
  investmentGain,
  loanPaidRatio,
  monthsCovered,
  netWorth,
  outgoingBreakdown,
  remainingBalance,
  responsibilityMonthlyAmount,
  totalIncome,
  wishMonthlyNeeded,
} from "@/lib/calculations";
import { DEFAULT_DATA } from "@/lib/storage";
import { createSeedData } from "@/lib/seed";
import type { AppData } from "@/types";

const M = "2026-10";
const today = new Date(2026, 9, 16);

const data: AppData = {
  ...DEFAULT_DATA,
  incomes: [
    { id: "a", month: M, name: "Salary", type: "salary", amount: 40000, frequency: "bimonthly" },
    { id: "b", month: M, name: "Gig", type: "freelance", amount: 10000, frequency: "monthly" },
    { id: "c", month: "2026-09", name: "Old", type: "other", amount: 999, frequency: "one-time" },
  ],
  payables: [
    { id: "p1", month: M, name: "Car", amount: 15000, dueDay: 5, category: "loan", status: "paid", loan: { principal: 500000, remainingBalance: 300000 } },
    { id: "p2", month: M, name: "Power", amount: 5000, dueDay: 20, category: "bill", status: "unpaid" },
  ],
  responsibilities: [
    { id: "r1", month: M, name: "Tuition", recipient: "Sis", amount: 30000, frequency: "quarterly" },
    { id: "r2", month: M, name: "Gift", recipient: "Mom", amount: 2000, frequency: "one-time" },
  ],
  expenses: [{ id: "e1", month: M, name: "Food", amount: 8000 }],
  savings: [{ id: "s1", name: "EF", isEmergency: true, target: 100000, current: 50000, monthlyContribution: 5000 }],
  investments: [{ id: "i1", name: "MP2", type: "mp2", invested: 20000, currentValue: 22000, monthlyContribution: 1000 }],
  assets: [{ id: "x1", name: "Car", type: "vehicle", value: 600000 }],
};

describe("calculations", () => {
  it("normalises income frequencies", () => {
    expect(incomeMonthlyAmount({ amount: 100, frequency: "bimonthly" })).toBe(200);
    expect(incomeMonthlyAmount({ amount: 100, frequency: "one-time" })).toBe(100);
    expect(totalIncome(data, M)).toBe(90000);
  });

  it("normalises responsibility frequencies", () => {
    expect(responsibilityMonthlyAmount({ amount: 1200, frequency: "annual" })).toBe(100);
    expect(responsibilityMonthlyAmount({ amount: 300, frequency: "quarterly" })).toBe(100);
    expect(responsibilityMonthlyAmount({ amount: 12, frequency: "weekly" })).toBe(52);
  });

  it("computes outgoing and remaining balance", () => {
    const b = outgoingBreakdown(data, M);
    expect(b).toEqual({ payables: 20000, responsibilities: 12000, savings: 5000, investments: 1000, expenses: 8000, total: 46000 });
    expect(remainingBalance(data, M)).toBe(44000);
  });

  it("computes net worth with loan balances", () => {
    expect(netWorth(data, M)).toBe(600000 + 50000 + 22000 - 300000);
    expect(netWorth(data, "2026-12")).toBe(372000);
  });

  it("flags overdue payables", () => {
    expect(effectiveStatus({ month: M, dueDay: 10, status: "unpaid" }, today)).toBe("overdue");
    expect(effectiveStatus({ month: M, dueDay: 20, status: "unpaid" }, today)).toBe("unpaid");
    expect(effectiveStatus({ month: "2026-09", dueDay: 28, status: "unpaid" }, today)).toBe("overdue");
    expect(effectiveStatus({ month: M, dueDay: 1, status: "paid" }, today)).toBe("paid");
  });

  it("plans wishlist savings and affordability", () => {
    const item = { price: 60000, setAside: 0, targetDate: "2027-04-16" };
    expect(wishMonthlyNeeded(item, today)).toBe(10000);
    expect(affordability(item, 15000, today)).toBe("on-track");
    expect(affordability(item, 5000, today)).toBe("not-yet");
    expect(affordability({ ...item, setAside: 55000 }, 5000, today)).toBe("affordable");
  });

  it("handles misc helpers", () => {
    expect(loanPaidRatio({ principal: 100, remainingBalance: 25 })).toBe(0.75);
    expect(investmentGain({ invested: 100, currentValue: 90 })).toEqual({ amount: -10, percent: -0.1 });
    expect(monthsCovered(60000, 20000)).toBe(3);
    expect(monthsCovered(1, 0)).toBe(0);
  });

  it("copies recurring items and advances loans", () => {
    let i = 0;
    const { data: next, copied } = copyRecurringToMonth(data, M, "2026-11", () => `n${++i}`);
    expect(copied).toBe(5);
    const car = next.payables.find((p) => p.month === "2026-11" && p.name === "Car");
    expect(car?.loan?.remainingBalance).toBe(285000);
    expect(car?.status).toBe("unpaid");
    expect(next.responsibilities.some((r) => r.month === "2026-11" && r.name === "Gift")).toBe(false);
    const again = copyRecurringToMonth(next, M, "2026-11", () => `m${++i}`);
    expect(again.copied).toBe(0);
  });

  it("builds a coherent seed", () => {
    const seed = createSeedData(today);
    expect(seed.netWorthHistory).toHaveLength(6);
    expect(remainingBalance(seed, M)).toBeGreaterThan(0);
  });
});
