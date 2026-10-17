import type { AppData, Client, Expense, Income, Payable, Responsibility } from "@/types";
import { addMonths, parseMonthKey, toMonthKey } from "@/lib/format";
import { netWorth } from "@/lib/calculations";
import { addDays, clientPayoutsForMonth, isoDate, materializePayout } from "@/lib/clients";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inMonths = (today: Date, months: number, day = 15) =>
  iso(new Date(today.getFullYear(), today.getMonth() + months, day));

export function createSeedData(today = new Date()): AppData {
  const current = toMonthKey(today);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(current, i - 5));
  const groceries = [8900, 9400, 8700, 10200, 9100, 9000];
  const transport = [4200, 4600, 3900, 4800, 4400, 4500];
  const dining = [3100, 2400, 3600, 2900, 2200, 2700];

  const incomes: Income[] = [];
  const payables: Payable[] = [];
  const responsibilities: Responsibility[] = [];
  const expenses: Expense[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;

  months.forEach((m, idx) => {
    const isCurrent = m === current;
    const monthsAgo = 5 - idx;
    const { year, month } = parseMonthKey(m);
    const day = (d: number) => iso(new Date(year, month, d));
    const paidIfPast = (dueDay: number, overdueDemo = false): Payable["status"] => {
      if (!isCurrent) return "paid";
      if (overdueDemo) return "unpaid";
      return dueDay < today.getDate() ? "paid" : "unpaid";
    };

    incomes.push(
      { id: id("inc"), month: m, name: "Salary — day job", type: "salary", amount: 36000, frequency: "bimonthly", dateReceived: day(15) },
    );
    if (idx === 3) {
      incomes.push({ id: id("inc"), month: m, name: "Sold old camera lens", type: "other", amount: 9500, frequency: "one-time", dateReceived: day(9) });
    }

    const carRemaining = 612400 + monthsAgo * 18450;
    const personalRemaining = 86800 + monthsAgo * 6200;
    payables.push(
      {
        id: id("pay"), month: m, name: "Car loan — Vios", amount: 18450, dueDay: 5, category: "loan", status: paidIfPast(5),
        loan: { principal: 980000, remainingBalance: carRemaining, interestRate: 6.5, endDate: inMonths(today, 34, 5) },
      },
      {
        id: id("pay"), month: m, name: "Personal loan", amount: 6200, dueDay: 18, category: "loan", status: paidIfPast(18),
        loan: { principal: 150000, remainingBalance: personalRemaining, interestRate: 12, endDate: inMonths(today, 14, 18) },
      },
      {
        id: id("pay"), month: m, name: "Life & health insurance", amount: 4200, dueDay: 10, category: "insurance", status: paidIfPast(10),
        insurance: { provider: "Sun Life", coverageType: "VUL — life + critical illness", paymentFrequency: "monthly", renewalDate: inMonths(today, 7, 10) },
      },
      { id: id("pay"), month: m, name: "Electricity", amount: [4600, 4900, 5200, 5400, 4800, 4750][idx], dueDay: today.getDate() > 2 && isCurrent ? Math.max(1, today.getDate() - 2) : 12, category: "bill", status: paidIfPast(12, true) },
      { id: id("pay"), month: m, name: "Water", amount: 650, dueDay: 20, category: "bill", status: paidIfPast(20) },
      { id: id("pay"), month: m, name: "Home fiber internet", amount: 1899, dueDay: Math.min(28, today.getDate() + 3), category: "bill", status: paidIfPast(28) },
      { id: id("pay"), month: m, name: "Mobile postpaid", amount: 1499, dueDay: Math.min(28, today.getDate() + 5), category: "bill", status: paidIfPast(28) },
      { id: id("pay"), month: m, name: "Netflix", amount: 549, dueDay: 8, category: "subscription", status: paidIfPast(8) },
      { id: id("pay"), month: m, name: "Spotify Family", amount: 279, dueDay: 14, category: "subscription", status: paidIfPast(14) },
      { id: id("pay"), month: m, name: "iCloud+ 200GB", amount: 149, dueDay: 25, category: "subscription", status: paidIfPast(25) },
    );

    responsibilities.push(
      { id: id("res"), month: m, name: "Monthly allowance", recipient: "Mama", amount: 8000, frequency: "monthly", notes: "Sent every 15th via GCash" },
      { id: id("res"), month: m, name: "College tuition", recipient: "Bea (sister)", amount: 24000, frequency: "quarterly", notes: "Split into monthly set-asides" },
      { id: id("res"), month: m, name: "Rent contribution", recipient: "Household", amount: 6000, frequency: "monthly" },
      { id: id("res"), month: m, name: "Pet care", recipient: "Mochi", amount: 2500, frequency: "monthly", notes: "Food, grooming, vet fund" },
    );

    expenses.push(
      { id: id("exp"), month: m, name: "Groceries", amount: groceries[idx] },
      { id: id("exp"), month: m, name: "Transport & fuel", amount: transport[idx] },
      { id: id("exp"), month: m, name: "Dining out", amount: dining[idx] },
    );
  });

  const t = isoDate(today);
  const monthsAgo = (n: number, day = 1) => isoDate(new Date(today.getFullYear(), today.getMonth() - n, day));
  const lastFriday = (() => {
    const d = new Date(today);
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    return isoDate(d);
  })();

  const clients: Client[] = [
    {
      id: "cli-acme",
      name: "Acme Studio",
      company: "Brand & web retainer",
      color: "#30D158",
      payType: "fixed",
      schedule: { kind: "semimonthly", day1: 15, day2: "last" },
      rates: [{ amount: 12500, from: monthsAgo(8) }],
      periods: [{ start: monthsAgo(8) }],
      status: "active",
      trackFrom: monthsAgo(8),
      backfill: false,
      notes: "Retainer covers 20 hrs/month of design + dev.",
    },
    {
      id: "cli-northwind",
      name: "Northwind Labs",
      company: "Hourly dev support",
      color: "#64D2FF",
      payType: "variable",
      schedule: { kind: "weekly", weekday: 5 },
      rates: [],
      hourlyRate: 650,
      periods: [{ start: monthsAgo(5) }],
      status: "active",
      trackFrom: monthsAgo(5),
      backfill: false,
    },
    {
      id: "cli-bluebird",
      name: "Bluebird Café",
      company: "Website build",
      color: "#BF5AF2",
      payType: "fixed",
      schedule: { kind: "monthly", day: 1 },
      rates: [{ amount: 8000, from: monthsAgo(6) }],
      periods: [{ start: monthsAgo(6), end: monthsAgo(2, 10) }],
      status: "terminated",
      endReason: "project-finished",
      endNote: "Site launched — handed over to their in-house team.",
      trackFrom: monthsAgo(6),
      backfill: false,
    },
  ];

  const hoursPattern = [8, 6.5, 9, 7, 5.5, 10, 8.5, 6, 7.5, 9.5, 4, 8];
  let hourIdx = 0;
  for (const client of clients) {
    for (const m of [addMonths(current, -6), ...months]) {
      for (const p of clientPayoutsForMonth(client, m, incomes)) {
        if (p.periodEnd > t) continue;
        if (client.payType === "fixed") {
          if (client.id === "cli-acme" && p.periodEnd > addDays(t, -2)) continue;
          incomes.push(materializePayout(p, { status: "received", dateReceived: p.periodEnd }, () => id("pay")));
        } else {
          if (p.periodEnd === lastFriday) continue;
          const hours = hoursPattern[hourIdx++ % hoursPattern.length];
          const skip = hourIdx % 11 === 0;
          incomes.push(
            materializePayout(
              p,
              skip
                ? { status: "skipped", amount: 0 }
                : { status: "received", amount: Math.round(hours * 650), hours, dateReceived: addDays(p.periodEnd, 1) },
              () => id("pay"),
            ),
          );
        }
      }
    }
  }

  const base: AppData = {
    version: 1,
    settings: { currency: "PHP", locale: "en-PH", startDay: 1 },
    clients,
    incomes,
    payables,
    responsibilities,
    expenses,
    savings: [
      { id: "sav-emergency", name: "Emergency fund", isEmergency: true, target: 300000, current: 186000, monthlyContribution: 6000 },
      { id: "sav-japan", name: "Japan trip", isEmergency: false, target: 120000, current: 54000, monthlyContribution: 4000 },
      { id: "sav-general", name: "General savings", isEmergency: false, target: 100000, current: 41500, monthlyContribution: 2000 },
    ],
    investments: [
      { id: "inv-stocks", name: "PSE index stocks", type: "stocks", invested: 150000, currentValue: 168400, monthlyContribution: 3000, dateStarted: "2022-03-01" },
      { id: "inv-mp2", name: "Pag-IBIG MP2", type: "mp2", invested: 72000, currentValue: 78550, monthlyContribution: 2000, dateStarted: "2023-01-15" },
      { id: "inv-uitf", name: "Equity index UITF", type: "mutual-fund", invested: 50000, currentValue: 53200, monthlyContribution: 2000, dateStarted: "2023-08-01" },
      { id: "inv-btc", name: "Bitcoin", type: "crypto", invested: 40000, currentValue: 34800, monthlyContribution: 0, dateStarted: "2024-02-10" },
    ],
    wishlist: [
      { id: "wish-desk", name: "Standing desk", price: 18500, priority: "need", targetDate: inMonths(today, 1), setAside: 15000 },
      { id: "wish-fridge", name: "Inverter refrigerator", price: 42000, priority: "need", targetDate: inMonths(today, 5), setAside: 12000 },
      { id: "wish-camera", name: "Mirrorless camera", price: 128000, priority: "want", targetDate: inMonths(today, 9), setAside: 32000 },
      { id: "wish-earbuds", name: "Noise-cancelling earbuds", price: 14990, priority: "want", setAside: 0 },
    ],
    assets: [
      { id: "ast-bank", name: "Payroll savings account", type: "bank", value: 45000, dateAcquired: "2019-06-01" },
      { id: "ast-cash", name: "Cash on hand", type: "cash", value: 8000 },
      { id: "ast-car", name: "Toyota Vios 2022", type: "vehicle", value: 640000, dateAcquired: "2022-11-20" },
      { id: "ast-laptop", name: "MacBook Pro 14\"", type: "gadget", value: 95000, dateAcquired: "2024-01-12" },
      { id: "ast-phone", name: "iPhone", type: "gadget", value: 48000, dateAcquired: "2024-10-05" },
    ],
    netWorthHistory: [],
  };

  const contributionsPerMonth = 6000 + 4000 + 2000 + 3000 + 2000 + 2000;
  const marketDrift = [-9200, -4100, -6800, 1500, -2300, 0];
  base.netWorthHistory = months.map((m, idx) => {
    const monthsAgo = 5 - idx;
    const value = netWorth(base, m) - monthsAgo * contributionsPerMonth + marketDrift[idx];
    return { month: m, value: Math.round(value) };
  });

  return base;
}
