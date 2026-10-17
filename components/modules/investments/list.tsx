"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Investment } from "@/types";
import { useStore } from "@/lib/store";
import { investmentGain } from "@/lib/calculations";
import { formatDate } from "@/lib/format";
import { INVESTMENT_TYPES, MODULES } from "@/lib/modules";
import { COLORS } from "@/lib/colors";
import { itemVariants } from "@/lib/motion";
import { Money, Pct } from "@/components/ui/money";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

export function GainLabel({ invested, currentValue, size = 12 }: { invested: number; currentValue: number; size?: number }) {
  const g = investmentGain({ invested, currentValue });
  const up = g.amount >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-income" : "text-payable"}`} style={{ fontSize: size }}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      <span className="sr-only">{up ? "Gain" : "Loss"}</span>
      <Money value={g.amount} signed className="text-current" symbolClassName="text-current" />
      <span>(<Pct value={g.percent} digits={1} absolute />)</span>
    </span>
  );
}

const ALLOC_COLORS = [COLORS.investments, COLORS.accent, COLORS.savings, COLORS.income, COLORS.responsibilities, COLORS.assets, COLORS.dueSoon];

export function Allocation({ items }: { items: Investment[] }) {
  const total = items.reduce((a, i) => a + i.currentValue, 0);
  const byType = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + i.currentValue;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  if (!total) return null;
  return (
    <motion.section variants={itemVariants} aria-label="Allocation" className="card mb-4 p-5">
      <h2 className="text-[17px] font-semibold">Allocation</h2>
      <div className="mt-4 flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
        {byType.map(([type, v], i) => (
          <motion.span
            key={type}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
            initial={{ width: 0 }}
            animate={{ width: `${(v / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {byType.map(([type, v], i) => (
          <li key={type} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
            <span className="text-fg-2">{INVESTMENT_TYPES[type as Investment["type"]].label}</span>
            <Pct value={v / total} className="font-medium" />
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

export function InvestmentList({ items }: { items: Investment[] }) {
  const { openEditor } = useStore();
  return (
    <ListGroup title="Holdings">
      {items.map((inv) => (
        <ListRow
          key={inv.id}
          icon={INVESTMENT_TYPES[inv.type].icon}
          color={MODULES.investments.color}
          title={inv.name}
          subtitle={INVESTMENT_TYPES[inv.type].label}
          below={
            inv.monthlyContribution ? (
              <p className="text-[12px] text-fg-2">
                <Money value={inv.monthlyContribution} className="text-[12px]" />/month · invested <Money value={inv.invested} className="text-[12px]" />
                {inv.dateStarted ? ` · since ${formatDate(inv.dateStarted, { month: "short", year: "numeric" })}` : ""}
              </p>
            ) : (
              <p className="text-[12px] text-fg-2">
                Invested <Money value={inv.invested} className="text-[12px]" /> · no monthly top-up
                {inv.dateStarted ? ` · since ${formatDate(inv.dateStarted, { month: "short", year: "numeric" })}` : ""}
              </p>
            )
          }
          right={
            <>
              <Money value={inv.currentValue} className="text-[15px] font-semibold" />
              <GainLabel invested={inv.invested} currentValue={inv.currentValue} />
            </>
          }
          onClick={() => openEditor({ module: "investments", item: inv as never })}
        />
      ))}
    </ListGroup>
  );
}
