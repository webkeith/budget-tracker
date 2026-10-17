"use client";

import { useEffect } from "react";
import type { Investment, InvestmentType } from "@/types";
import { uid } from "@/lib/format";
import { INVESTMENT_TYPES, MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, NumberInput, Select, TextInput } from "@/components/ui/field";
import { FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function InvestmentForm({ item, onSubmit, onValidChange }: FormProps<Investment>) {
  const [d, set] = useDraft<Investment>(
    item ?? { id: uid(), name: "", type: "stocks", invested: 0, currentValue: 0, monthlyContribution: 0, dateStarted: "" },
  );
  const valid = d.name.trim().length > 0 && d.invested > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim(), currentValue: d.currentValue || d.invested }); }}>
      <AmountInput id="inv-current" label="Current value" value={d.currentValue || undefined} onChange={(v) => set("currentValue", v ?? 0)} color={MODULES.investments.color} autoFocus={!item} />
      <FormGrid>
        <Field label="Name" htmlFor="inv-name">
          <TextInput id="inv-name" placeholder="e.g. Pag-IBIG MP2" value={d.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Type" htmlFor="inv-type">
          <Select<InvestmentType>
            id="inv-type"
            value={d.type}
            onChange={(v) => set("type", v)}
            options={Object.entries(INVESTMENT_TYPES).map(([value, m]) => ({ value: value as InvestmentType, label: m.label }))}
          />
        </Field>
        <Field label="Total amount invested" htmlFor="inv-invested">
          <NumberInput id="inv-invested" min={0} value={d.invested || undefined} onChange={(v) => set("invested", v ?? 0)} />
        </Field>
        <Field label="Monthly contribution" htmlFor="inv-monthly">
          <NumberInput id="inv-monthly" min={0} value={d.monthlyContribution || undefined} onChange={(v) => set("monthlyContribution", v ?? 0)} />
        </Field>
        <Field label="Date started" htmlFor="inv-date">
          <TextInput id="inv-date" type="date" value={d.dateStarted ?? ""} onChange={(e) => set("dateStarted", e.target.value)} />
        </Field>
      </FormGrid>
    </form>
  );
}
