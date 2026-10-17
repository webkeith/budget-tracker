"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { Payable, PayableCategory } from "@/types";
import { useStore } from "@/lib/store";
import { effectiveStatus, isDueSoon, loanMonthsLeft, loanPaidRatio } from "@/lib/calculations";
import { formatDate, ordinal } from "@/lib/format";
import { MODULES, PAYABLE_CATEGORIES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Money, Pct } from "@/components/ui/money";
import { StatusChip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

const FREQ_LABEL = { monthly: "monthly", quarterly: "quarterly", "semi-annual": "every 6 months", annual: "yearly" } as const;

function PaidToggle({ p }: { p: Payable }) {
  const { patch, toast } = useStore();
  const paid = p.status === "paid";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      aria-pressed={paid}
      aria-label={paid ? `Mark ${p.name} as unpaid` : `Mark ${p.name} as paid`}
      onClick={() => {
        patch("payables", p.id, { status: paid ? "unpaid" : "paid" });
        if (!paid) toast(`${p.name} marked as paid`, "success");
      }}
      className="inline-flex size-11 items-center justify-center rounded-full"
    >
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full border-[1.5px] transition-colors",
          paid ? "border-income bg-income text-black" : "border-white/25 text-transparent hover:border-white/50",
        )}
      >
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    </motion.button>
  );
}

export function PayableRow({ p }: { p: Payable }) {
  const { openEditor } = useStore();
  const status = effectiveStatus(p);
  const soon = isDueSoon(p);
  const cat = PAYABLE_CATEGORIES[p.category];

  let subtitle: React.ReactNode = `Due the ${ordinal(p.dueDay)}`;
  if (p.insurance) {
    subtitle = [p.insurance.provider, p.insurance.coverageType, `pays ${FREQ_LABEL[p.insurance.paymentFrequency]}`].filter(Boolean).join(" · ");
  }

  let below: React.ReactNode = null;
  if (p.loan) {
    const ratio = loanPaidRatio(p.loan);
    const months = loanMonthsLeft(p.loan, p.amount);
    below = (
      <div>
        <ProgressBar value={ratio} color={MODULES.income.color} label={`${p.name} paid off`} />
        <p className="mt-1.5 flex flex-wrap gap-x-2 text-[12px] text-fg-2">
          <span>
            <Money value={p.loan.remainingBalance} className="text-[12px] text-fg" /> left of <Money value={p.loan.principal} className="text-[12px]" />
          </span>
          <span>· <Pct value={ratio} /> paid</span>
          <span>· ~{months} mo to go</span>
          {p.loan.interestRate ? <span>· {p.loan.interestRate}% interest</span> : null}
          {p.loan.endDate ? <span>· ends {formatDate(p.loan.endDate, { month: "short", year: "numeric" })}</span> : null}
        </p>
      </div>
    );
  } else if (p.insurance?.renewalDate) {
    below = <p className="text-[12px] text-fg-2">Renews {formatDate(p.insurance.renewalDate)} · due the {ordinal(p.dueDay)}</p>;
  }

  return (
    <ListRow
      icon={cat.icon}
      color={status === "overdue" ? MODULES.payables.color : soon ? "#FF9F0A" : MODULES.payables.color}
      title={p.name}
      subtitle={subtitle}
      below={below}
      right={
        <>
          <Money value={p.amount} className="text-[15px] font-semibold" />
          <StatusChip status={status} dueSoon={soon} />
        </>
      }
      trailing={<PaidToggle p={p} />}
      onClick={() => openEditor({ module: "payables", item: p as never })}
      className={cn(soon && status !== "paid" && "bg-due/[0.05]", status === "overdue" && "bg-payable/[0.06]")}
    />
  );
}

export function PayableGroup({ category, items }: { category: PayableCategory; items: Payable[] }) {
  const total = items.reduce((a, p) => a + p.amount, 0);
  return (
    <ListGroup title={PAYABLE_CATEGORIES[category].plural} total={<Money value={total} />}>
      {items.map((p) => (
        <PayableRow key={p.id} p={p} />
      ))}
    </ListGroup>
  );
}
