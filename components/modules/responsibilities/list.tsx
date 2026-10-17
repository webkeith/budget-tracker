"use client";

import { Cat, GraduationCap, HandHeart, Home, Users } from "lucide-react";
import type { Responsibility } from "@/types";
import { useStore } from "@/lib/store";
import { responsibilityMonthlyAmount } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { Money } from "@/components/ui/money";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

const FREQ: Record<Responsibility["frequency"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  annual: "Yearly",
  "one-time": "One-time",
};

function iconFor(r: Responsibility) {
  const t = `${r.name} ${r.recipient}`.toLowerCase();
  if (/tuition|school|college|education/.test(t)) return GraduationCap;
  if (/rent|house|household|home/.test(t)) return Home;
  if (/pet|dog|cat|mochi|vet/.test(t)) return Cat;
  if (/mama|papa|mom|dad|family|parent|lola|lolo/.test(t)) return Users;
  return HandHeart;
}

export function ResponsibilityList({ items }: { items: Responsibility[] }) {
  const { openEditor } = useStore();
  const total = items.reduce((a, r) => a + responsibilityMonthlyAmount(r), 0);
  const color = MODULES.responsibilities.color;
  return (
    <ListGroup title="This month" total={<Money value={total} />}>
      {items.map((r) => (
        <ListRow
          key={r.id}
          icon={iconFor(r)}
          color={color}
          title={r.name}
          subtitle={[r.recipient ? `For ${r.recipient}` : null, FREQ[r.frequency], r.notes].filter(Boolean).join(" · ")}
          right={
            <>
              <Money value={responsibilityMonthlyAmount(r)} className="text-[15px] font-semibold" />
              {r.frequency !== "monthly" && r.frequency !== "one-time" ? (
                <span className="text-[12px] text-fg-2">
                  <Money value={r.amount} className="text-[12px]" /> {FREQ[r.frequency].toLowerCase()}
                </span>
              ) : null}
            </>
          }
          onClick={() => openEditor({ module: "responsibilities", item: r as never })}
        />
      ))}
    </ListGroup>
  );
}
