"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import type { AppData, MonthKey } from "@/types";
import {
  affordability,
  averageMonthlyExpenses,
  loanMonthsLeft,
  loanPaidRatio,
  loansForMonth,
  monthlyTrend,
  monthsCovered,
  netWorth,
  netWorthSeries,
  outgoingBreakdown,
  progress,
  remainingBalance,
  totalAssets,
  totalIncome,
  totalInvestmentValue,
  totalLoanBalance,
  totalOutgoing,
  totalSavings,
  upcomingDues,
} from "@/lib/calculations";
import { addMonths, formatDate, monthLabel, ordinal, parseMonthKey } from "@/lib/format";
import { MODULES, PAYABLE_CATEGORIES } from "@/lib/modules";
import { COLORS } from "@/lib/colors";
import { itemVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Money, Pct } from "@/components/ui/money";
import { CardHeader } from "@/components/ui/card";
import { AffordChip, Chip, StatusChip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { IconTile } from "@/components/ui/icon-tile";
import { Segmented } from "@/components/ui/segmented";
import { Ring } from "@/components/charts/ring";
import { Donut } from "@/components/charts/donut";
import { AreaTrend } from "@/components/charts/area-trend";
import { Sparkline } from "@/components/charts/sparkline";
import { ClientAvatar } from "@/components/modules/clients/parts";
import { clientMonthlyIncome, clientReceivedInMonth } from "@/lib/clients";

function Panel({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <motion.section variants={itemVariants} aria-label={label} className={cn("card p-5", className)}>
      {children}
    </motion.section>
  );
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-mr-2 -mt-1 inline-flex h-11 items-center gap-0.5 rounded-full px-2 text-[13px] font-medium text-accent hover:brightness-125"
    >
      See all
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}

export function NetWorthHero({ insights }: { insights: string[] }) {
  const { data, month } = useStore();
  const value = netWorth(data, month);
  const series = netWorthSeries(data, month, 6);
  const prev = series.length > 1 ? series[series.length - 2].value : undefined;
  const delta = prev !== undefined ? value - prev : 0;
  const pct = prev ? delta / Math.abs(prev) : 0;
  const parts = [
    { label: "Assets", value: totalAssets(data), color: MODULES.assets.color },
    { label: "Savings", value: totalSavings(data), color: MODULES.savings.color },
    { label: "Investments", value: totalInvestmentValue(data), color: MODULES.investments.color },
    { label: "Loans", value: -totalLoanBalance(data, month), color: MODULES.payables.color },
  ];

  return (
    <motion.section variants={itemVariants} aria-label="Net worth" className="card relative overflow-hidden">
      <div aria-hidden className="mesh-glow pointer-events-none absolute inset-0" />
      <div className="relative grid gap-6 p-5 md:p-7 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div>
          <p className="label">Net worth</p>
          <Money
            value={value}
            animate
            className="mt-1 block font-display text-[44px] font-semibold leading-[1.05] sm:text-[56px] lg:text-[64px]"
          />
          {prev !== undefined ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip color={delta >= 0 ? "var(--income)" : "var(--payable)"} icon={delta >= 0 ? TrendingUp : TrendingDown}>
                <span><Money value={delta} signed className="text-[12px]" symbolClassName="text-current" /> (<Pct value={pct} digits={1} absolute />)</span>
              </Chip>
              <span className="text-[13px] text-fg-2">vs. {monthLabel(addMonths(month, -1), "short")}</span>
            </div>
          ) : null}
          <div className="mt-5 space-y-1" aria-live="polite">
            {insights.map((line, i) => (
              <p key={i} className={cn(i === 0 ? "text-[17px] font-medium text-fg" : "text-[15px] text-fg-2")}>
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Sparkline data={series} color={COLORS.accent} height={88} id="networth" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {parts.map((p) => (
              <div key={p.label}>
                <dt className="flex items-center gap-1.5 text-[12px] font-medium text-fg-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}
                </dt>
                <dd className="mt-0.5 text-[15px] font-semibold">
                  <Money value={p.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </motion.section>
  );
}

type Period = "month" | "quarter" | "year";
const PERIOD_MONTHS: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

function periodTotals(data: AppData, month: MonthKey, period: Period) {
  let income = 0;
  let outgoing = 0;
  for (let i = 0; i < PERIOD_MONTHS[period]; i++) {
    const m = addMonths(month, -i);
    income += totalIncome(data, m);
    outgoing += totalOutgoing(data, m);
  }
  return { income, outgoing, remaining: income - outgoing };
}

export function SummaryRow({ period, onPeriod }: { period: Period; onPeriod: (p: Period) => void }) {
  const { data, month } = useStore();
  const t = useMemo(() => periodTotals(data, month, period), [data, month, period]);
  const caption = period === "month" ? monthLabel(month, "long") : period === "quarter" ? "Last 3 months" : "Last 12 months";
  const tiles = [
    { label: "Income", value: t.income, icon: ArrowDownLeft, color: MODULES.income.color, href: "/income" },
    { label: "Total outgoing", value: t.outgoing, icon: ArrowUpRight, color: MODULES.payables.color, href: "/payables" },
    { label: "Remaining balance", value: t.remaining, icon: Scale, color: t.remaining < 0 ? MODULES.payables.color : COLORS.accent, href: undefined },
  ];
  return (
    <motion.div variants={itemVariants}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-fg-2">{caption}</p>
        <Segmented<Period>
          ariaLabel="Summary period"
          size="sm"
          value={period}
          onChange={onPeriod}
          options={[
            { value: "month", label: "Month" },
            { value: "quarter", label: "Quarter" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {tiles.map((tile, idx) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <p className="label">{tile.label}</p>
                <IconTile icon={tile.icon} color={tile.color} size="sm" />
              </div>
              <Money
                value={tile.value}
                animate
                className={cn("mt-2 block text-[22px] font-semibold sm:text-[26px] lg:text-[30px]", tile.label === "Remaining balance" && tile.value < 0 && "text-payable")}
              />
              {tile.label === "Remaining balance" ? (
                <p className="mt-1 text-[13px] text-fg-2">{tile.value < 0 ? "Over budget — spending more than you earn." : "Free to spend or save."}</p>
              ) : (
                <p className="mt-1 hidden text-[13px] text-fg-2 sm:block">{tile.label === "Income" ? "Everything that came in." : "Bills, support, savings & spending."}</p>
              )}
            </>
          );
          return tile.href ? (
            <motion.div key={tile.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href={tile.href} className="card block h-full p-4 transition-colors hover:border-border-strong sm:p-5">
                {inner}
              </Link>
            </motion.div>
          ) : (
            <div key={tile.label} className={cn("card p-4 sm:p-5", idx === 2 && "col-span-2 sm:col-span-1")}>
              {inner}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function SpendingDonut({ className }: { className?: string }) {
  const { data, month } = useStore();
  const b = outgoingBreakdown(data, month);
  const slices = [
    { key: "payables", label: "Payables", value: b.payables, color: MODULES.payables.color },
    { key: "responsibilities", label: "Responsibilities", value: b.responsibilities, color: MODULES.responsibilities.color },
    { key: "expenses", label: "Other spending", value: b.expenses, color: MODULES.expenses.color },
    { key: "savings", label: "Savings", value: b.savings, color: MODULES.savings.color },
    { key: "investments", label: "Investments", value: b.investments, color: MODULES.investments.color },
  ];
  return (
    <Panel className={className} label="Where your money goes">
      <CardHeader title="Where your money goes" subtitle={monthLabel(month)} />
      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[184px_minmax(0,1fr)]">
        <Donut data={slices} total={b.total} caption="Outgoing" />
        <ul className="space-y-2.5">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-3 text-[14px]">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate text-fg-2">{s.label}</span>
              <Money value={s.value} className="font-medium" />
              <Pct value={b.total > 0 ? s.value / b.total : 0} className="w-10 text-right text-[13px] text-fg-2" />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export function TrendPanel({ className, period }: { className?: string; period: Period }) {
  const { data, month } = useStore();
  const points = useMemo(() => {
    if (period === "month") {
      return monthlyTrend(data, month, 6).map((p) => ({ label: monthLabel(p.month, "short"), income: p.income, outgoing: p.outgoing }));
    }
    if (period === "year") {
      return monthlyTrend(data, month, 12).map((p) => ({ label: monthLabel(p.month, "short").slice(0, 3), income: p.income, outgoing: p.outgoing }));
    }
    const raw = monthlyTrend(data, month, 12);
    const quarters: { label: string; income: number; outgoing: number }[] = [];
    for (let q = 0; q < 4; q++) {
      const chunk = raw.slice(q * 3, q * 3 + 3);
      const last = chunk[chunk.length - 1].month;
      const { year, month: mi } = parseMonthKey(last);
      quarters.push({
        label: `Q${Math.floor(mi / 3) + 1} ’${String(year).slice(2)}`,
        income: chunk.reduce((a, c) => a + c.income, 0),
        outgoing: chunk.reduce((a, c) => a + c.outgoing, 0),
      });
    }
    return quarters;
  }, [data, month, period]);

  const subtitle = period === "month" ? "Last 6 months" : period === "quarter" ? "Last 4 quarters" : "Last 12 months";
  return (
    <Panel className={className} label="Income vs. outgoing">
      <CardHeader
        title="Income vs. outgoing"
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-3 text-[12px] text-fg-2">
            <span className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-3 rounded-full bg-income" />Income</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-3 rounded-full bg-payable" />Outgoing</span>
          </div>
        }
      />
      <div className="mt-4">
        {points.some((p) => p.income > 0 || p.outgoing > 0) ? (
          <AreaTrend data={points} height={220} />
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-dashed border-border text-center text-[14px] text-fg-2">
            Your trend shows up once you log a month or two.
          </div>
        )}
      </div>
    </Panel>
  );
}

export function UpcomingDues({ className }: { className?: string }) {
  const { data, month, currentMonth, openEditor } = useStore();
  const dues = upcomingDues(data, month).slice(0, 5);
  const isCurrent = month === currentMonth;
  return (
    <Panel className={className} label="Upcoming dues">
      <CardHeader title="Upcoming dues" subtitle={dues.length ? `${dues.length} unpaid this month` : "Nothing left to pay"} action={<SeeAll href="/payables" label="See all payables" />} />
      {dues.length === 0 ? (
        <p className="mt-6 text-[14px] text-fg-2">You&apos;re all caught up for {monthLabel(month, "short")}.</p>
      ) : (
        <ul className="-mx-2 mt-3">
          {dues.map((p) => {
            const cat = PAYABLE_CATEGORIES[p.category];
            const when =
              p.status === "overdue"
                ? `Was due the ${ordinal(p.dueDay)}`
                : isCurrent && p.daysLeft === 0
                  ? "Due today"
                  : isCurrent && p.daysLeft === 1
                    ? "Due tomorrow"
                    : isCurrent && p.daysLeft <= 7
                      ? `Due in ${p.daysLeft} days`
                      : `Due the ${ordinal(p.dueDay)}`;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openEditor({ module: "payables", item: p as never })}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <IconTile icon={cat.icon} color={MODULES.payables.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{p.name}</span>
                    <span className={cn("block text-[12px]", p.status === "overdue" ? "text-payable" : p.daysLeft <= 7 && isCurrent ? "text-due" : "text-fg-2")}>{when}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Money value={p.amount} className="text-[14px] font-semibold" />
                    {p.status === "overdue" ? <StatusChip status="overdue" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function SavingsRings({ className }: { className?: string }) {
  const { data, month } = useStore();
  const avg = averageMonthlyExpenses(data, month);
  const funds = data.savings.slice(0, 4);
  return (
    <Panel className={className} label="Savings goals">
      <CardHeader title="Savings goals" subtitle={`${data.savings.length} ${data.savings.length === 1 ? "fund" : "funds"}`} action={<SeeAll href="/savings" label="See all savings" />} />
      {funds.length === 0 ? (
        <p className="mt-6 text-[14px] text-fg-2">Start with an emergency fund — 3 to 6 months of expenses is a good goal.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
          {funds.map((f, i) => {
            const pct = progress(f.current, f.target);
            const color = f.isEmergency ? MODULES.savings.color : [COLORS.income, COLORS.investments, COLORS.responsibilities][i % 3];
            return (
              <li key={f.id} className="flex flex-col items-center text-center">
                <Ring value={pct} color={color} size={84} stroke={10} label={f.name}>
                  <Pct value={pct} className="text-[15px] font-semibold" />
                </Ring>
                <p className="mt-2 max-w-full truncate text-[13px] font-medium">{f.name}</p>
                <p className="text-[12px] text-fg-2">
                  {f.isEmergency && avg > 0 ? `${monthsCovered(f.current, avg).toFixed(1)} months covered` : <Money value={f.target - f.current} className="text-[12px]" />}
                  {f.isEmergency && avg > 0 ? null : " to go"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function WishlistProgress({ className }: { className?: string }) {
  const { data, month } = useStore();
  const left = remainingBalance(data, month);
  const items = data.wishlist.filter((w) => !w.bought).slice(0, 4);
  return (
    <Panel className={className} label="Planning to buy">
      <CardHeader title="Planning to buy" subtitle="Things you're saving up for" action={<SeeAll href="/planning" label="See all wishlist items" />} />
      {items.length === 0 ? (
        <p className="mt-6 text-[14px] text-fg-2">Add something you&apos;d like to buy and we&apos;ll tell you how to get there.</p>
      ) : (
        <ul className="mt-4 grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {items.map((w) => (
            <li key={w.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[14px] font-medium">{w.name}</span>
                <AffordChip value={affordability(w, left)} />
              </div>
              <ProgressBar className="mt-2" value={progress(w.setAside, w.price)} color={COLORS.accent} label={`${w.name} progress`} />
              <p className="mt-1.5 text-[12px] text-fg-2">
                <Money value={w.setAside} className="text-[12px]" /> of <Money value={w.price} className="text-[12px]" />
                {w.targetDate ? ` · by ${formatDate(w.targetDate, { month: "short", year: "numeric" })}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function LoanPayoff({ className }: { className?: string }) {
  const { data, month } = useStore();
  const loans = loansForMonth(data, month);
  return (
    <Panel className={className} label="Loan payoff">
      <CardHeader title="Loan payoff" subtitle={loans.length ? "How far you've come" : "No loans — nice."} action={<SeeAll href="/payables" label="See all loans" />} />
      {loans.length === 0 ? (
        <p className="mt-6 text-[14px] text-fg-2">Add a loan under Payables to track how fast you&apos;re paying it down.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {loans.map((p) => {
            const ratio = loanPaidRatio(p.loan!);
            const months = loanMonthsLeft(p.loan!, p.amount);
            return (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[14px] font-medium">{p.name}</span>
                  <span className="text-[13px] text-fg-2"><Pct value={ratio} /> paid</span>
                </div>
                <ProgressBar className="mt-2" value={ratio} color={MODULES.income.color} label={`${p.name} paid off`} />
                <p className="mt-1.5 text-[12px] text-fg-2">
                  <Money value={p.loan!.remainingBalance} className="text-[12px]" /> left · about {months} {months === 1 ? "month" : "months"} to go
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function IncomeByClient({ className }: { className?: string }) {
  const { data, month, openClientSheet, openEditor } = useStore();
  const rows = data.clients
    .map((c) => ({ client: c, total: clientMonthlyIncome(data, c, month), received: clientReceivedInMonth(data, c, month) }))
    .filter((r) => r.total > 0 || r.client.status === "active")
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel className={className} label="Income by client">
      <CardHeader title="Income by client" subtitle={monthLabel(month)} action={<SeeAll href="/income?tab=clients" label="See all clients" />} />
      {rows.length === 0 ? (
        <div className="mt-6">
          <p className="text-[14px] text-fg-2">Add the people and companies who pay you to see who brings in what.</p>
          <button type="button" onClick={() => openEditor({ module: "clients" })} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-accent">
            Add a client
          </button>
        </div>
      ) : (
        <ul className="-mx-2 mt-3">
          {rows.map(({ client, total, received }) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => openClientSheet({ kind: "detail", clientId: client.id })}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
              >
                <ClientAvatar client={client} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium">{client.name}</span>
                    <Money value={total} className="text-[14px] font-semibold" />
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.span
                      className="relative block h-full rounded-full"
                      style={{ backgroundColor: client.color, opacity: 0.35 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(total / max) * 100}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 24 }}
                    >
                      <motion.span
                        className="absolute inset-y-0 left-0 block rounded-full"
                        style={{ backgroundColor: client.color }}
                        initial={{ width: 0 }}
                        animate={{ width: total ? `${(received / total) * 100}%` : 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 24, delay: 0.1 }}
                      />
                    </motion.span>
                  </span>
                  <span className="mt-1 block text-[12px] text-fg-2">
                    {client.payType === "fixed" ? "Fixed" : "Hourly"} · <Money value={received} className="text-[12px]" /> received
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
