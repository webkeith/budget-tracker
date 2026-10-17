import type {
  Affordability,
  AppData,
  Income,
  Investment,
  MonthKey,
  Payable,
  PayableStatus,
  Responsibility,
  SavingsFund,
  WishItem,
} from "@/types";
import { addMonths, compareMonths, parseMonthKey, toMonthKey } from "@/lib/format";
import { allPayoutsForMonth, payoutCounts } from "@/lib/clients";

const sum = (values: number[]) => values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

export function incomeMonthlyAmount(income: Pick<Income, "amount" | "frequency" | "clientId" | "status">): number {
  if (income.clientId) return payoutCounts(income);
  return income.frequency === "bimonthly" ? income.amount * 2 : income.amount;
}

export function standaloneIncomes(data: AppData, month: MonthKey): Income[] {
  return data.incomes.filter((i) => i.month === month && !i.clientId);
}

export function responsibilityMonthlyAmount(r: Pick<Responsibility, "amount" | "frequency">): number {
  switch (r.frequency) {
    case "weekly":
      return (r.amount * 52) / 12;
    case "quarterly":
      return r.amount / 3;
    case "annual":
      return r.amount / 12;
    default:
      return r.amount;
  }
}

export const byMonth = <T extends { month: MonthKey }>(items: T[], month: MonthKey) =>
  items.filter((i) => i.month === month);

export function totalIncome(data: AppData, month: MonthKey): number {
  return receivedIncome(data, month) + expectedIncome(data, month);
}

export function receivedIncome(data: AppData, month: MonthKey): number {
  const standalone = sum(standaloneIncomes(data, month).map(incomeMonthlyAmount));
  const payouts = sum(allPayoutsForMonth(data, month).filter((p) => p.status === "received").map((p) => p.amount));
  return standalone + payouts;
}

export function expectedIncome(data: AppData, month: MonthKey): number {
  return sum(allPayoutsForMonth(data, month).filter((p) => p.status === "expected").map(payoutCounts));
}

export function totalPayables(data: AppData, month: MonthKey): number {
  return sum(byMonth(data.payables, month).map((p) => p.amount));
}

export function totalResponsibilities(data: AppData, month: MonthKey): number {
  return sum(byMonth(data.responsibilities, month).map(responsibilityMonthlyAmount));
}

export function totalExpenses(data: AppData, month: MonthKey): number {
  return sum(byMonth(data.expenses, month).map((e) => e.amount));
}

export function totalSavingsContributions(funds: SavingsFund[]): number {
  return sum(funds.map((f) => f.monthlyContribution));
}

export function totalInvestmentContributions(investments: Investment[]): number {
  return sum(investments.map((i) => i.monthlyContribution));
}

export interface OutgoingBreakdown {
  payables: number;
  responsibilities: number;
  savings: number;
  investments: number;
  expenses: number;
  total: number;
}

export function outgoingBreakdown(data: AppData, month: MonthKey): OutgoingBreakdown {
  const payables = totalPayables(data, month);
  const responsibilities = totalResponsibilities(data, month);
  const savings = totalSavingsContributions(data.savings);
  const investments = totalInvestmentContributions(data.investments);
  const expenses = totalExpenses(data, month);
  return {
    payables,
    responsibilities,
    savings,
    investments,
    expenses,
    total: payables + responsibilities + savings + investments + expenses,
  };
}

export function totalOutgoing(data: AppData, month: MonthKey): number {
  return outgoingBreakdown(data, month).total;
}

export function remainingBalance(data: AppData, month: MonthKey): number {
  return totalIncome(data, month) - totalOutgoing(data, month);
}

export function loansForMonth(data: AppData, month: MonthKey): Payable[] {
  const loanMonths = Array.from(
    new Set(data.payables.filter((p) => p.category === "loan" && p.loan).map((p) => p.month)),
  )
    .filter((m) => compareMonths(m, month) <= 0)
    .sort(compareMonths);
  const latest = loanMonths[loanMonths.length - 1];
  if (!latest) return [];
  return data.payables.filter((p) => p.month === latest && p.category === "loan" && p.loan);
}

export function totalLoanBalance(data: AppData, month: MonthKey): number {
  return sum(loansForMonth(data, month).map((p) => p.loan?.remainingBalance ?? 0));
}

export function totalAssets(data: AppData): number {
  return sum(data.assets.map((a) => a.value));
}

export function totalSavings(data: AppData): number {
  return sum(data.savings.map((s) => s.current));
}

export function totalInvestmentValue(data: AppData): number {
  return sum(data.investments.map((i) => i.currentValue));
}

export function netWorth(data: AppData, month: MonthKey): number {
  return totalAssets(data) + totalSavings(data) + totalInvestmentValue(data) - totalLoanBalance(data, month);
}

export function essentialMonthlySpend(data: AppData, month: MonthKey): number {
  return totalPayables(data, month) + totalResponsibilities(data, month) + totalExpenses(data, month);
}

export function averageMonthlyExpenses(data: AppData, month: MonthKey, lookback = 3): number {
  const values: number[] = [];
  for (let i = 0; i < lookback; i++) {
    const v = essentialMonthlySpend(data, addMonths(month, -i));
    if (v > 0) values.push(v);
  }
  return values.length ? sum(values) / values.length : 0;
}

export function monthsCovered(amount: number, avgMonthlyExpenses: number): number {
  if (avgMonthlyExpenses <= 0) return 0;
  return amount / avgMonthlyExpenses;
}

export function progress(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, current / target));
}

export function loanPaidRatio(loan: { principal: number; remainingBalance: number }): number {
  if (loan.principal <= 0) return 0;
  return Math.max(0, Math.min(1, (loan.principal - loan.remainingBalance) / loan.principal));
}

export function loanMonthsLeft(loan: { remainingBalance: number }, amortization: number): number {
  if (amortization <= 0) return 0;
  return Math.ceil(loan.remainingBalance / amortization);
}

export function investmentGain(inv: Pick<Investment, "invested" | "currentValue">) {
  const amount = inv.currentValue - inv.invested;
  const percent = inv.invested > 0 ? amount / inv.invested : 0;
  return { amount, percent };
}

export function monthsUntil(targetISO: string | undefined, today = new Date()): number {
  if (!targetISO) return 0;
  const t = new Date(`${targetISO.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(t.getTime())) return 0;
  const months = (t.getFullYear() - today.getFullYear()) * 12 + (t.getMonth() - today.getMonth());
  return Math.max(0, months);
}

export function wishMonthlyNeeded(item: Pick<WishItem, "price" | "setAside" | "targetDate">, today = new Date()): number {
  const left = Math.max(0, item.price - item.setAside);
  if (left === 0) return 0;
  const months = monthsUntil(item.targetDate, today);
  return months <= 0 ? left : left / months;
}

export function affordability(
  item: Pick<WishItem, "price" | "setAside" | "targetDate">,
  monthlyRemaining: number,
  today = new Date(),
): Affordability {
  const left = Math.max(0, item.price - item.setAside);
  if (left === 0 || left <= Math.max(0, monthlyRemaining)) return "affordable";
  const needed = wishMonthlyNeeded(item, today);
  if (item.targetDate && monthsUntil(item.targetDate, today) > 0 && needed <= Math.max(0, monthlyRemaining)) {
    return "on-track";
  }
  return "not-yet";
}

export function effectiveStatus(p: Pick<Payable, "month" | "dueDay" | "status">, today = new Date()): PayableStatus {
  if (p.status === "paid") return "paid";
  const current = toMonthKey(today);
  const cmp = compareMonths(p.month, current);
  if (cmp < 0) return "overdue";
  if (cmp === 0 && p.dueDay < today.getDate()) return "overdue";
  return p.status === "overdue" ? "overdue" : "unpaid";
}

export function dueDate(p: Pick<Payable, "month" | "dueDay">): Date {
  const { year, month } = parseMonthKey(p.month);
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(p.dueDay, lastDay));
}

export function daysUntilDue(p: Pick<Payable, "month" | "dueDay">, today = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDate(p).getTime() - start.getTime()) / 86_400_000);
}

export function isDueSoon(p: Pick<Payable, "month" | "dueDay" | "status">, today = new Date(), window = 7): boolean {
  if (p.status === "paid") return false;
  const d = daysUntilDue(p, today);
  return d >= 0 && d <= window;
}

export function upcomingDues(data: AppData, month: MonthKey, today = new Date()) {
  return byMonth(data.payables, month)
    .map((p) => ({ ...p, status: effectiveStatus(p, today), daysLeft: daysUntilDue(p, today) }))
    .filter((p) => p.status !== "paid")
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface TrendPoint {
  month: MonthKey;
  income: number;
  outgoing: number;
}

export function monthlyTrend(data: AppData, endMonth: MonthKey, count = 6): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(endMonth, -i);
    points.push({ month: m, income: totalIncome(data, m), outgoing: totalOutgoing(data, m) });
  }
  return points;
}

export function netWorthSeries(data: AppData, endMonth: MonthKey, count = 6) {
  const history = new Map(data.netWorthHistory.map((s) => [s.month, s.value]));
  const series: { month: MonthKey; value: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(endMonth, -i);
    const v = i === 0 ? netWorth(data, m) : history.get(m);
    if (v !== undefined) series.push({ month: m, value: v });
  }
  return series;
}

export function hasMonthData(data: AppData, month: MonthKey): boolean {
  return (
    data.incomes.some((i) => i.month === month) ||
    allPayoutsForMonth(data, month).length > 0 ||
    data.payables.some((p) => p.month === month) ||
    data.responsibilities.some((r) => r.month === month)
  );
}

export function copyRecurringToMonth(
  data: AppData,
  from: MonthKey,
  to: MonthKey,
  makeId: () => string,
): { data: AppData; copied: number } {
  const existsIn = (items: { month: MonthKey; name: string }[], name: string) =>
    items.some((i) => i.month === to && i.name.trim().toLowerCase() === name.trim().toLowerCase());

  const incomes = byMonth(data.incomes, from)
    .filter((i) => !i.clientId && i.frequency !== "one-time" && !existsIn(data.incomes, i.name))
    .map((i) => ({ ...i, id: makeId(), month: to, dateReceived: undefined }));

  const payables = byMonth(data.payables, from)
    .filter((p) => !existsIn(data.payables, p.name))
    .filter((p) => !(p.loan && Math.max(0, p.loan.remainingBalance - (p.status === "paid" ? p.amount : 0)) === 0))
    .map((p) => ({
      ...p,
      id: makeId(),
      month: to,
      status: "unpaid" as const,
      loan: p.loan
        ? {
            ...p.loan,
            remainingBalance: Math.max(0, p.loan.remainingBalance - (p.status === "paid" ? p.amount : 0)),
          }
        : undefined,
    }));

  const responsibilities = byMonth(data.responsibilities, from)
    .filter((r) => r.frequency !== "one-time" && !existsIn(data.responsibilities, r.name))
    .map((r) => ({ ...r, id: makeId(), month: to }));

  return {
    data: {
      ...data,
      incomes: [...data.incomes, ...incomes],
      payables: [...data.payables, ...payables],
      responsibilities: [...data.responsibilities, ...responsibilities],
    },
    copied: incomes.length + payables.length + responsibilities.length,
  };
}

export function recordNetWorth(data: AppData, month: MonthKey): AppData {
  const value = Math.round(netWorth(data, month));
  const existing = data.netWorthHistory.find((s) => s.month === month);
  if (existing && existing.value === value) return data;
  const others = data.netWorthHistory.filter((s) => s.month !== month);
  return {
    ...data,
    netWorthHistory: [...others, { month, value }].sort((a, b) => compareMonths(a.month, b.month)),
  };
}

export function emergencyFund(data: AppData): SavingsFund | undefined {
  return data.savings.find((s) => s.isEmergency);
}
