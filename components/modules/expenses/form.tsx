"use client";

import { useEffect } from "react";
import type { Expense } from "@/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, TextInput } from "@/components/ui/field";
import { FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function ExpenseForm({ item, onSubmit, onValidChange }: FormProps<Expense>) {
  const { month } = useStore();
  const [d, set] = useDraft<Expense>(item ?? { id: uid(), month, name: "", amount: 0, date: "" });
  const valid = d.name.trim().length > 0 && d.amount > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim() }); }}>
      <AmountInput id="exp-amount" label="Amount this month" value={d.amount || undefined} onChange={(v) => set("amount", v ?? 0)} color={MODULES.expenses.color} autoFocus={!item} />
      <FormGrid>
        <Field label="What it's for" htmlFor="exp-name">
          <TextInput id="exp-name" placeholder="e.g. Groceries" value={d.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Date (optional)" htmlFor="exp-date">
          <TextInput id="exp-date" type="date" value={d.date ?? ""} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </FormGrid>
    </form>
  );
}
