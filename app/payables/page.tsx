"use client";

import type { PayableCategory } from "@/types";
import { useStore } from "@/lib/store";
import { byMonth, effectiveStatus, isDueSoon, totalExpenses, totalPayables } from "@/lib/calculations";
import { monthLabel } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AddButton } from "@/components/modules/shared/add-button";
import { CopyMonthButton } from "@/components/modules/shared/copy-month-button";
import { StatTile } from "@/components/modules/shared/list";
import { PayableGroup } from "@/components/modules/payables/list";
import { ExpenseList } from "@/components/modules/expenses/list";

const ORDER: PayableCategory[] = ["loan", "insurance", "bill", "subscription"];

export default function PayablesPage() {
  const { data, month, openEditor } = useStore();
  const fmt = useFormatMoney();
  const items = byMonth(data.payables, month).sort((a, b) => a.dueDay - b.dueDay);
  const expenses = byMonth(data.expenses, month);
  const total = totalPayables(data, month);
  const paid = items.filter((p) => p.status === "paid");
  const paidAmount = paid.reduce((a, p) => a + p.amount, 0);
  const overdue = items.filter((p) => effectiveStatus(p) === "overdue").length;
  const soon = items.filter((p) => isDueSoon(p)).length;
  const meta = MODULES.payables;

  return (
    <Page>
      <PageHeader
        title={meta.title}
        description={meta.description}
        showMonth
        actions={
          <>
            {items.length ? <CopyMonthButton /> : null}
            <AddButton module="payables" />
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label={`Due in ${monthLabel(month, "short")}`} className="col-span-2 md:col-span-1" hint={expenses.length ? <>Plus <Money value={totalExpenses(data, month)} className="text-[13px]" /> other spending</> : undefined}>
          <Money value={total} animate />
        </StatTile>
        <StatTile label="Paid so far" hint={<ProgressBar className="mt-2" value={total ? paidAmount / total : 0} color={MODULES.income.color} label="Share of payables paid" />}>
          <span className="num">
            {paid.length}
            <span className="text-[0.6em] font-medium text-fg-2"> / {items.length}</span>
          </span>
        </StatTile>
        <StatTile label="Needs attention" hint={overdue ? `${overdue} overdue` : soon ? `${soon} due within 7 days` : "Nothing urgent"}>
          <span className={overdue ? "num text-payable" : soon ? "num text-due" : "num"}>{overdue + soon}</span>
        </StatTile>
      </div>

      {items.length === 0 ? (
        <div className="card mb-4">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title={`No bills for ${monthLabel(month, "short")} yet`}
            example={`Electricity · ${fmt(4800)} · due the 12th`}
            cta="Add a payable"
            onAction={() => openEditor({ module: "payables" })}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {ORDER.map((cat) => {
            const list = items.filter((p) => p.category === cat);
            return list.length ? <PayableGroup key={cat} category={cat} items={list} /> : null;
          })}
        </div>
      )}
      <div className="mt-4">
        <ExpenseList items={expenses} />
      </div>
    </Page>
  );
}
