import type {
  AppData,
  Client,
  ClientPeriod,
  Income,
  MonthKey,
  PaySchedule,
  Payout,
  TerminationReason,
  Weekday,
} from "@/types";
import { addMonths, compareMonths, parseMonthKey, toMonthKey } from "@/lib/format";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const CLIENT_COLORS = ["#30D158", "#64D2FF", "#BF5AF2", "#FF9F0A", "#5E5CE6", "#FFD60A", "#FF375F", "#0A84FF"];

export const TERMINATION_REASONS: Record<TerminationReason, string> = {
  "contract-ended": "Contract ended",
  "stopped-paying": "Stopped paying",
  "project-finished": "Project finished",
  other: "Other",
};

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function dayDiff(a: string, b: string): number {
  const da = fromIso(a);
  const db = fromIso(b);
  return Math.round((Date.UTC(da.getFullYear(), da.getMonth(), da.getDate()) - Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())) / 86_400_000);
}

function lastDayOf(month: MonthKey): number {
  const { year, month: m } = parseMonthKey(month);
  return new Date(year, m + 1, 0).getDate();
}

function dateIn(month: MonthKey, day: number): string {
  const { year, month: m } = parseMonthKey(month);
  return isoDate(new Date(year, m, Math.min(day, lastDayOf(month))));
}

export function monthOfIso(iso: string): MonthKey {
  return iso.slice(0, 7);
}

export function paydaysInMonth(schedule: PaySchedule, month: MonthKey): string[] {
  const last = lastDayOf(month);
  const days: string[] = [];
  switch (schedule.kind) {
    case "weekly": {
      for (let d = 1; d <= last; d++) {
        const iso = dateIn(month, d);
        if (fromIso(iso).getDay() === schedule.weekday) days.push(iso);
      }
      break;
    }
    case "biweekly": {
      for (let d = 1; d <= last; d++) {
        const iso = dateIn(month, d);
        const diff = dayDiff(iso, schedule.anchor);
        if (((diff % 14) + 14) % 14 === 0) days.push(iso);
      }
      break;
    }
    case "semimonthly": {
      const a = Math.min(schedule.day1, last);
      const b = schedule.day2 === "last" ? last : Math.min(schedule.day2, last);
      for (const d of Array.from(new Set([a, b])).sort((x, y) => x - y)) days.push(dateIn(month, d));
      break;
    }
    case "monthly": {
      days.push(dateIn(month, schedule.day === "last" ? last : schedule.day));
      break;
    }
  }
  return days;
}

export function periodStartFor(schedule: PaySchedule, payday: string): string {
  switch (schedule.kind) {
    case "weekly":
      return addDays(payday, -6);
    case "biweekly":
      return addDays(payday, -13);
    default: {
      const month = monthOfIso(payday);
      const candidates = [...paydaysInMonth(schedule, addMonths(month, -1)), ...paydaysInMonth(schedule, month)].filter((d) => d < payday);
      const prev = candidates[candidates.length - 1];
      return prev ? addDays(prev, 1) : addDays(payday, -30);
    }
  }
}

export function scheduleLabel(schedule: PaySchedule): string {
  const ord = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  };
  switch (schedule.kind) {
    case "weekly":
      return `Weekly · ${WEEKDAYS[schedule.weekday]}s`;
    case "biweekly":
      return `Every 2 weeks · ${WEEKDAYS[fromIso(schedule.anchor).getDay()]}s`;
    case "semimonthly":
      return `Twice a month · ${ord(schedule.day1)} & ${schedule.day2 === "last" ? "last day" : ord(schedule.day2)}`;
    case "monthly":
      return `Monthly · ${schedule.day === "last" ? "last day" : ord(schedule.day)}`;
  }
}

export function payoutsPerMonthEstimate(schedule: PaySchedule): number {
  switch (schedule.kind) {
    case "weekly":
      return 52 / 12;
    case "biweekly":
      return 26 / 12;
    case "semimonthly":
      return 2;
    default:
      return 1;
  }
}

export function isActiveOn(client: Pick<Client, "periods">, iso: string): boolean {
  return client.periods.some((p) => p.start <= iso && (!p.end || iso <= p.end));
}

export function rateOn(client: Pick<Client, "rates">, iso: string): number {
  const sorted = [...client.rates].sort((a, b) => a.from.localeCompare(b.from));
  let rate = sorted[0]?.amount ?? 0;
  for (const r of sorted) if (r.from <= iso) rate = r.amount;
  return rate;
}

export function currentRate(client: Pick<Client, "rates">, today = new Date()): number {
  return rateOn(client, isoDate(today));
}

export const payoutCounts = (p: Pick<Income, "status" | "amount">) =>
  p.status === "needs-amount" || p.status === "skipped" ? 0 : p.amount;

export function payoutKey(clientId: string, periodStart: string) {
  return `${clientId}|${periodStart}`;
}

function firstStart(client: Client): string | undefined {
  return [...client.periods].map((p) => p.start).sort()[0];
}

export function clientPayoutsForMonth(client: Client, month: MonthKey, incomes: Income[]): Payout[] {
  const stored = incomes.filter((i) => i.clientId === client.id && i.month === month);
  const byKey = new Map(stored.map((i) => [payoutKey(client.id, i.periodStart ?? ""), i]));
  const used = new Set<string>();
  const out: Payout[] = [];

  for (const payday of paydaysInMonth(client.schedule, month)) {
    if (!isActiveOn(client, payday)) continue;
    const periodStart = periodStartFor(client.schedule, payday);
    const key = payoutKey(client.id, periodStart);
    const existing = byKey.get(key);
    if (existing) {
      used.add(existing.id);
      out.push(toPayout(existing, client));
      continue;
    }
    const beforeTracking = payday < client.trackFrom;
    if (beforeTracking && !(client.backfill && client.payType === "fixed")) continue;
    out.push({
      id: `virtual:${key}`,
      month,
      name: client.name,
      type: "freelance",
      frequency: "one-time",
      clientId: client.id,
      periodStart,
      periodEnd: payday,
      amount: client.payType === "fixed" ? rateOn(client, payday) : 0,
      status: client.payType === "fixed" ? (beforeTracking ? "received" : "expected") : "needs-amount",
      dateReceived: beforeTracking ? payday : undefined,
      virtual: true,
      payType: client.payType,
    });
  }

  for (const s of stored) if (!used.has(s.id)) out.push(toPayout(s, client));
  return out.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

function toPayout(i: Income, client: Pick<Client, "payType">): Payout {
  return {
    ...i,
    periodStart: i.periodStart ?? i.dateReceived ?? `${i.month}-01`,
    periodEnd: i.periodEnd ?? i.dateReceived ?? `${i.month}-01`,
    status: i.status ?? "received",
    clientId: i.clientId!,
    virtual: false,
    payType: client.payType,
  };
}

export function allPayoutsForMonth(data: Pick<AppData, "clients" | "incomes">, month: MonthKey): Payout[] {
  const known = new Set(data.clients.map((c) => c.id));
  const payouts = data.clients.flatMap((c) => clientPayoutsForMonth(c, month, data.incomes));
  const orphans = data.incomes
    .filter((i) => i.clientId && i.month === month && !known.has(i.clientId))
    .map((i) => toPayout(i, { payType: "fixed" }));
  return [...payouts, ...orphans];
}

export function clientMonthlyIncome(data: Pick<AppData, "incomes">, client: Client, month: MonthKey): number {
  return clientPayoutsForMonth(client, month, data.incomes).reduce((a, p) => a + payoutCounts(p), 0);
}

export function clientReceivedInMonth(data: Pick<AppData, "incomes">, client: Client, month: MonthKey): number {
  return clientPayoutsForMonth(client, month, data.incomes)
    .filter((p) => p.status === "received")
    .reduce((a, p) => a + p.amount, 0);
}

export function clientHoursInMonth(data: Pick<AppData, "incomes">, client: Client, month: MonthKey): number {
  return data.incomes.filter((i) => i.clientId === client.id && i.month === month).reduce((a, i) => a + (i.hours ?? 0), 0);
}

export function clientAveragePayout(data: Pick<AppData, "incomes">, client: Client, endMonth: MonthKey, months = 3): number {
  const amounts: number[] = [];
  for (let i = 0; i < months; i++) {
    for (const p of clientPayoutsForMonth(client, addMonths(endMonth, -i), data.incomes)) {
      if (p.status === "received" && p.amount > 0) amounts.push(p.amount);
    }
  }
  return amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
}

export function clientMonthsRange(client: Client, endMonth: MonthKey): MonthKey[] {
  const start = firstStart(client);
  if (!start) return [];
  const months: MonthKey[] = [];
  let m = monthOfIso(start);
  let guard = 0;
  while (compareMonths(m, endMonth) <= 0 && guard++ < 240) {
    months.push(m);
    m = addMonths(m, 1);
  }
  return months;
}

export function clientTotalEarned(data: Pick<AppData, "incomes">, client: Client, today = new Date()): number {
  return clientMonthsRange(client, toMonthKey(today)).reduce((sum, m) => sum + clientReceivedInMonth(data, client, m), 0);
}

export function clientHistory(data: Pick<AppData, "incomes">, client: Client, today = new Date(), limit = 24): Payout[] {
  const months = clientMonthsRange(client, toMonthKey(today)).reverse();
  const out: Payout[] = [];
  for (const m of months) {
    const list = clientPayoutsForMonth(client, m, data.incomes)
      .filter((p) => !(p.virtual && p.periodEnd > isoDate(today)))
      .reverse();
    out.push(...list);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

export function pendingVariablePayouts(data: Pick<AppData, "clients" | "incomes">, today = new Date(), lookbackDays = 35): Payout[] {
  const t = isoDate(today);
  const from = addDays(t, -lookbackDays);
  const months = Array.from(new Set([monthOfIso(from), monthOfIso(t)]));
  return data.clients
    .filter((c) => c.payType === "variable")
    .flatMap((c) => months.flatMap((m) => clientPayoutsForMonth(c, m, data.incomes)))
    .filter((p) => p.status === "needs-amount" && p.periodEnd <= t && p.periodEnd >= from)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

export function overdueFixedPayouts(data: Pick<AppData, "clients" | "incomes">, month: MonthKey, today = new Date()): Payout[] {
  const t = isoDate(today);
  return allPayoutsForMonth(data, month).filter((p) => p.payType === "fixed" && p.status === "expected" && p.periodEnd < t);
}

export function materializePayout(p: Payout, changes: Partial<Income>, makeId: () => string): Income {
  const { virtual: _v, payType: _t, ...rest } = p;
  void _v;
  void _t;
  return { ...rest, id: p.virtual ? makeId() : p.id, ...changes };
}

export function pauseClient(client: Client, onDate: string): Client {
  return {
    ...client,
    status: "paused",
    periods: closeOpenPeriod(client.periods, onDate),
  };
}

export function reactivateClient(client: Client, startDate: string): Client {
  const periods = closeOpenPeriod(client.periods, addDays(startDate, -1)).filter((p) => !p.end || p.end >= p.start);
  return {
    ...client,
    status: "active",
    endReason: undefined,
    endNote: undefined,
    periods: [...periods, { start: startDate }],
  };
}

function closeOpenPeriod(periods: ClientPeriod[], end: string): ClientPeriod[] {
  return periods.map((p) => (p.end ? p : { ...p, end: end < p.start ? p.start : end }));
}

export interface TerminateResult {
  client: Client;
  upserts: Income[];
  removeIds: string[];
}

export function terminateClient(
  data: Pick<AppData, "incomes">,
  client: Client,
  opts: { endDate: string; reason?: TerminationReason; note?: string; keepUnreceived: boolean },
  makeId: () => string,
): TerminateResult {
  const upserts: Income[] = [];
  const removeIds: string[] = [];
  const endMonth = monthOfIso(opts.endDate);
  const scanMonths = [endMonth, addMonths(endMonth, 1)];

  if (opts.keepUnreceived) {
    for (const m of scanMonths) {
      for (const p of clientPayoutsForMonth(client, m, data.incomes)) {
        if (p.virtual && p.periodEnd > opts.endDate && p.periodStart <= opts.endDate && (p.status === "expected" || p.status === "needs-amount")) {
          upserts.push(materializePayout(p, {}, makeId));
        }
      }
    }
  } else {
    for (const i of data.incomes) {
      if (i.clientId === client.id && (i.periodEnd ?? "") > opts.endDate && (i.status === "expected" || i.status === "needs-amount")) {
        removeIds.push(i.id);
      }
    }
  }

  return {
    client: {
      ...client,
      status: "terminated",
      endReason: opts.reason,
      endNote: opts.note,
      periods: closeOpenPeriod(client.periods, opts.endDate),
    },
    upserts,
    removeIds,
  };
}

export function clientEndDate(client: Client): string | undefined {
  if (client.status === "active") return undefined;
  const ends = client.periods.map((p) => p.end).filter(Boolean) as string[];
  return ends.sort().pop();
}

export function suggestColor(existing: Client[]): string {
  const used = new Set(existing.map((c) => c.color));
  return CLIENT_COLORS.find((c) => !used.has(c)) ?? CLIENT_COLORS[existing.length % CLIENT_COLORS.length];
}

export const weekdayOptions = WEEKDAYS.map((label, value) => ({ value: String(value), label })) as { value: `${Weekday}`; label: string }[];

export function nextPayoutToLog(data: Pick<AppData, "incomes">, client: Client, today = new Date()): Payout | null {
  const t = isoDate(today);
  const month = monthOfIso(t);
  const list = [addMonths(month, -1), month, addMonths(month, 1)].flatMap((m) => clientPayoutsForMonth(client, m, data.incomes));
  const open = list.filter((p) => p.status === "needs-amount" || p.status === "expected");
  const from = addDays(t, -35);
  const due = open.filter((p) => p.periodEnd <= t && p.periodEnd >= from);
  if (due.length) return due[0];
  return open.find((p) => p.periodEnd >= t) ?? null;
}
