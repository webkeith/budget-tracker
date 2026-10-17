"use client";

import type { Income } from "@/types";
import { useStore } from "@/lib/store";
import { incomeMonthlyAmount } from "@/lib/calculations";
import { formatDate } from "@/lib/format";
import { INCOME_TYPES, MODULES } from "@/lib/modules";
import { Money } from "@/components/ui/money";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

const FREQ: Record<Income["frequency"], string> = { monthly: "Monthly", bimonthly: "Twice a month", "one-time": "One-time" };

export function IncomeList({ items, title = "Sources" }: { items: Income[]; title?: string }) {
  const { openEditor } = useStore();
  const total = items.reduce((a, i) => a + incomeMonthlyAmount(i), 0);
  return (
    <ListGroup title={title} total={<Money value={total} />}>
      {items.map((i) => (
        <ListRow
          key={i.id}
          icon={INCOME_TYPES[i.type].icon}
          color={MODULES.income.color}
          title={i.name}
          subtitle={[INCOME_TYPES[i.type].label, FREQ[i.frequency], i.dateReceived ? `Received ${formatDate(i.dateReceived, { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · ")}
          right={
            <>
              <Money value={incomeMonthlyAmount(i)} className="text-[15px] font-semibold" tone="income" />
              {i.frequency === "bimonthly" ? (
                <span className="text-[12px] text-fg-2">
                  2 × <Money value={i.amount} className="text-[12px]" />
                </span>
              ) : null}
            </>
          }
          onClick={() => openEditor({ module: "income", item: i as never })}
        />
      ))}
    </ListGroup>
  );
}
