"use client";

import { Plus } from "lucide-react";
import type { Expense } from "@/types";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { Money } from "@/components/ui/money";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

export function ExpenseList({ items }: { items: Expense[] }) {
  const { openEditor } = useStore();
  const total = items.reduce((a, e) => a + e.amount, 0);
  const meta = MODULES.expenses;
  return (
    <ListGroup
      id="other-spending"
      title="Other spending"
      total={<Money value={total} />}
      action={
        <button
          type="button"
          aria-label="Add other spending"
          onClick={() => openEditor({ module: "expenses" })}
          className="-mr-1 inline-flex size-9 items-center justify-center rounded-full text-accent hover:bg-white/[0.06]"
        >
          <Plus className="size-[18px]" aria-hidden />
        </button>
      }
    >
      {items.length === 0 ? (
        <li className="px-3 pb-4 pt-2 text-[14px] text-fg-2">
          Everyday spending like groceries or transport. Tap + to add one.
        </li>
      ) : (
        items.map((e) => (
          <ListRow
            key={e.id}
            icon={meta.icon}
            color={meta.color}
            title={e.name}
            subtitle={e.date ? formatDate(e.date, { month: "short", day: "numeric" }) : "This month"}
            right={<Money value={e.amount} className="text-[15px] font-semibold" />}
            onClick={() => openEditor({ module: "expenses", item: e as never })}
          />
        ))
      )}
    </ListGroup>
  );
}
