"use client";

import { useEffect } from "react";
import type { SavingsFund } from "@/types";
import { uid } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, NumberInput, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function SavingsForm({ item, onSubmit, onValidChange }: FormProps<SavingsFund>) {
  const [d, set] = useDraft<SavingsFund>(
    item ?? { id: uid(), name: "", isEmergency: false, target: 0, current: 0, monthlyContribution: 0 },
  );
  const valid = d.name.trim().length > 0 && d.target > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim() }); }}>
      <AmountInput id="sav-current" label="Saved so far" value={d.current || undefined} onChange={(v) => set("current", v ?? 0)} color={MODULES.savings.color} autoFocus={!item} />
      <Field label="Fund name" htmlFor="sav-name">
        <TextInput id="sav-name" placeholder="e.g. Emergency fund, Travel" value={d.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <FormGrid>
        <Field label="Target amount" htmlFor="sav-target">
          <NumberInput id="sav-target" min={0} value={d.target || undefined} onChange={(v) => set("target", v ?? 0)} />
        </Field>
        <Field label="Monthly contribution" htmlFor="sav-monthly">
          <NumberInput id="sav-monthly" min={0} value={d.monthlyContribution || undefined} onChange={(v) => set("monthlyContribution", v ?? 0)} />
        </Field>
      </FormGrid>
      <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-white/[0.02] px-4 py-3">
        <div>
          <label htmlFor="sav-emergency" className="text-[15px] font-medium">This is my emergency fund</label>
          <p className="text-[13px] text-fg-2">We&apos;ll show how many months of expenses it covers.</p>
        </div>
        <Switch id="sav-emergency" label="Emergency fund" checked={d.isEmergency} onChange={(v) => set("isEmergency", v)} />
      </div>
    </form>
  );
}
