import type { AppData, MonthKey } from "@/types";
import {
  averageMonthlyExpenses,
  emergencyFund,
  monthsCovered,
  progress,
  remainingBalance,
  totalIncome,
  upcomingDues,
} from "@/lib/calculations";
import { formatMoney } from "@/lib/format";
import { overdueFixedPayouts, pendingVariablePayouts } from "@/lib/clients";

export function buildInsights(
  data: AppData,
  month: MonthKey,
  isCurrentMonth: boolean,
  today = new Date(),
  format?: (v: number) => string,
): string[] {
  const money = format ?? ((v: number) => formatMoney(v, data.settings.currency, data.settings.locale));
  const lines: string[] = [];
  const income = totalIncome(data, month);
  const left = remainingBalance(data, month);

  if (income === 0) {
    lines.push("Add your income for this month to see what's left to spend.");
  } else if (left < 0) {
    lines.push(`You're ${money(Math.abs(left))} over this month. Try trimming a want or moving a contribution.`);
  } else {
    lines.push(`You have ${money(left)} left ${isCurrentMonth ? "this month" : "for the month"}.`);
  }

  const ef = emergencyFund(data);
  if (ef) {
    const pct = Math.round(progress(ef.current, ef.target) * 100);
    const covered = monthsCovered(ef.current, averageMonthlyExpenses(data, month));
    lines.push(
      pct >= 100
        ? `Your emergency fund is complete — about ${covered.toFixed(1)} months covered.`
        : `You're ${pct}% to your emergency fund goal.`,
    );
  }

  if (isCurrentMonth) {
    const dues = upcomingDues(data, month, today);
    const overdue = dues.filter((d) => d.status === "overdue").length;
    const soon = dues.filter((d) => d.status !== "overdue" && d.daysLeft <= 7).length;
    if (overdue > 0) lines.push(`${overdue} ${overdue === 1 ? "bill is" : "bills are"} overdue.`);
    else if (soon > 0) lines.push(`${soon} ${soon === 1 ? "bill" : "bills"} due this week.`);
    else if (dues.length === 0 && data.payables.some((p) => p.month === month)) lines.push("All bills are paid. Nice.");

    const late = overdueFixedPayouts(data, month, today);
    if (late.length) {
      const names = Array.from(new Set(late.map((p) => data.clients.find((c) => c.id === p.clientId)?.name).filter(Boolean)));
      lines.push(`${names.slice(0, 2).join(" and ")}${names.length > 2 ? " and others" : ""} ${late.length === 1 ? "hasn't" : "haven't"} paid yet — ${money(late.reduce((a, p) => a + p.amount, 0))} is past due.`);
    }
    const pending = pendingVariablePayouts(data, today).length;
    if (pending) lines.push(`${pending} client payment${pending === 1 ? "" : "s"} to log this week.`);
  }

  return lines;
}
