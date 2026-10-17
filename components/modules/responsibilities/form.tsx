"use client";

import { useEffect } from "react";
import type { Responsibility, ResponsibilityFrequency } from "@/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function ResponsibilityForm({ item, onSubmit, onValidChange }: FormProps<Responsibility>) {
  const { month } = useStore();
  const [d, set] = useDraft<Responsibility>(
    item ?? { id: uid(), month, name: "", recipient: "", amount: 0, frequency: "monthly", notes: "" },
  );
  const valid = d.name.trim().length > 0 && d.amount > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim(), recipient: d.recipient.trim() }); }}>
      <AmountInput id="resp-amount" label="Amount" value={d.amount || undefined} onChange={(v) => set("amount", v ?? 0)} color={MODULES.responsibilities.color} autoFocus={!item} />
      <FormGrid>
        <Field label="What it's for" htmlFor="resp-name">
          <TextInput id="resp-name" placeholder="e.g. Monthly allowance" value={d.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Who it's for" htmlFor="resp-recipient">
          <TextInput id="resp-recipient" placeholder="e.g. Mama" value={d.recipient} onChange={(e) => set("recipient", e.target.value)} />
        </Field>
      </FormGrid>
      <Field label="How often" htmlFor="resp-freq" hint="Non-monthly amounts are spread out evenly per month.">
        <Select<ResponsibilityFrequency>
          id="resp-freq"
          value={d.frequency}
          onChange={(v) => set("frequency", v)}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Every 3 months" },
            { value: "annual", label: "Yearly" },
            { value: "one-time", label: "One-time" },
          ]}
        />
      </Field>
      <Field label="Notes" htmlFor="resp-notes">
        <TextArea id="resp-notes" placeholder="Optional" value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </form>
  );
}
