"use client";

import { useEffect } from "react";
import type { Income, IncomeFrequency, IncomeSourceType } from "@/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { INCOME_TYPES, MODULES } from "@/lib/modules";
import { useFormatMoney } from "@/components/ui/money";
import { nextPayoutToLog } from "@/lib/clients";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, Select, TextInput } from "@/components/ui/field";
import { ChoicePills, FORM_ID, FormGrid, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function IncomeForm({ item, onSubmit, onValidChange }: FormProps<Income>) {
  const { month, data, openClientSheet, closeEditor } = useStore();
  const activeClients = data.clients.filter((c) => c.status === "active");
  const fmt = useFormatMoney();
  const [d, set] = useDraft<Income>(
    item ?? { id: uid(), month, name: "", type: "salary", amount: 0, frequency: "monthly", dateReceived: "" },
  );
  const valid = d.name.trim().length > 0 && d.amount > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);

  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim() }); }}>
      <AmountInput id="income-amount" label={d.frequency === "bimonthly" ? "Amount per payout" : "Amount"} value={d.amount || undefined} onChange={(v) => set("amount", v ?? 0)} color={MODULES.income.color} autoFocus={!item} />
      {d.frequency === "bimonthly" && d.amount > 0 ? (
        <p className="text-center text-[13px] text-fg-2">Paid twice a month — counts as {fmt(d.amount * 2)} for the month.</p>
      ) : null}
      {!item && activeClients.length ? (
        <Field label="From a client?" htmlFor="income-client" hint="Picking a client logs it against their next payday.">
          <Select
            id="income-client"
            value=""
            onChange={(id) => {
              const client = activeClients.find((c) => c.id === id);
              if (!client) return;
              const payout = nextPayoutToLog(data, client);
              closeEditor();
              if (payout) openClientSheet({ kind: "log", clientId: client.id, payout });
              else openClientSheet({ kind: "detail", clientId: client.id });
            }}
            options={[{ value: "", label: "No client" }, ...activeClients.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
      ) : null}
      <Field label="Source name" htmlFor="income-name">
        <TextInput id="income-name" placeholder="e.g. Salary, Client retainer" value={d.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Type">
        <ChoicePills label="Type" value={d.type} onChange={(v: IncomeSourceType) => set("type", v)} options={Object.entries(INCOME_TYPES).map(([value, m]) => ({ value: value as IncomeSourceType, label: m.label, color: MODULES.income.color }))} />
      </Field>
      <FormGrid>
        <Field label="How often" htmlFor="income-freq">
          <Select<IncomeFrequency>
            id="income-freq"
            value={d.frequency}
            onChange={(v) => set("frequency", v)}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "bimonthly", label: "Twice a month (bi-monthly)" },
              { value: "one-time", label: "One-time" },
            ]}
          />
        </Field>
        <Field label="Date received" htmlFor="income-date">
          <TextInput id="income-date" type="date" value={d.dateReceived ?? ""} onChange={(e) => set("dateReceived", e.target.value)} />
        </Field>
      </FormGrid>
    </form>
  );
}
