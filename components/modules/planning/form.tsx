"use client";

import { useEffect } from "react";
import type { WishItem, WishPriority } from "@/types";
import { uid } from "@/lib/format";
import { wishMonthlyNeeded } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, NumberInput, TextInput } from "@/components/ui/field";
import { useFormatMoney } from "@/components/ui/money";
import { ChoicePills, FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function PlanningForm({ item, onSubmit, onValidChange }: FormProps<WishItem>) {
  const fmt = useFormatMoney();
  const [d, set] = useDraft<WishItem>(item ?? { id: uid(), name: "", price: 0, priority: "want", targetDate: "", setAside: 0 });
  const valid = d.name.trim().length > 0 && d.price > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  const needed = wishMonthlyNeeded(d);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim() }); }}>
      <AmountInput id="wish-price" label="Estimated price" value={d.price || undefined} onChange={(v) => set("price", v ?? 0)} color={MODULES.planning.color} autoFocus={!item} />
      <Field label="Item" htmlFor="wish-name">
        <TextInput id="wish-name" placeholder="e.g. New laptop" value={d.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Priority">
        <ChoicePills
          label="Priority"
          value={d.priority}
          onChange={(v: WishPriority) => set("priority", v)}
          options={[
            { value: "need", label: "Need", color: MODULES.payables.color },
            { value: "want", label: "Want", color: MODULES.investments.color },
          ]}
        />
      </Field>
      <FormGrid>
        <Field label="Amount set aside" htmlFor="wish-aside">
          <NumberInput id="wish-aside" min={0} value={d.setAside || undefined} onChange={(v) => set("setAside", v ?? 0)} />
        </Field>
        <Field label="Target date" htmlFor="wish-date">
          <TextInput id="wish-date" type="date" value={d.targetDate ?? ""} onChange={(e) => set("targetDate", e.target.value)} />
        </Field>
      </FormGrid>
      {d.price > 0 && d.targetDate && needed > 0 ? (
        <p className="rounded-[14px] bg-accent/10 px-4 py-3 text-[14px] text-fg">
          Save <span className="num font-semibold">{fmt(Math.ceil(needed))}</span>/month to reach this by your target date.
        </p>
      ) : null}
    </form>
  );
}
