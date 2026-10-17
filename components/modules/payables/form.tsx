"use client";

import { useEffect } from "react";
import type { Payable, PayableCategory, PayableStatus, PaymentFrequency } from "@/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { MODULES, PAYABLE_CATEGORIES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, NumberInput, Select, TextInput } from "@/components/ui/field";
import { ChoicePills, FORM_ID, FormGrid, FormSection, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function PayableForm({ item, preset, onSubmit, onValidChange }: FormProps<Payable>) {
  const { month } = useStore();
  const [d, set] = useDraft<Payable>(
    item ?? {
      id: uid(),
      month,
      name: "",
      amount: 0,
      dueDay: 15,
      category: (preset?.category as PayableCategory) ?? "bill",
      status: "unpaid",
    },
  );

  const loan = d.loan ?? { principal: 0, remainingBalance: 0 };
  const insurance = d.insurance ?? { provider: "", coverageType: "", paymentFrequency: "monthly" as PaymentFrequency };
  const valid =
    d.name.trim().length > 0 &&
    d.amount > 0 &&
    d.dueDay >= 1 &&
    d.dueDay <= 31 &&
    (d.category !== "loan" || (loan.principal > 0 && loan.remainingBalance >= 0 && loan.remainingBalance <= loan.principal));
  useEffect(() => onValidChange(valid), [valid, onValidChange]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      ...d,
      name: d.name.trim(),
      loan: d.category === "loan" ? loan : undefined,
      insurance: d.category === "insurance" ? insurance : undefined,
    });
  };

  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={submit}>
      <AmountInput
        id="payable-amount"
        label={d.category === "loan" ? "Monthly amortization" : d.category === "insurance" ? "Premium this month" : "Amount"}
        value={d.amount || undefined}
        onChange={(v) => set("amount", v ?? 0)}
        color={MODULES.payables.color}
        autoFocus={!item}
      />
      <Field label="Category">
        <ChoicePills
          label="Category"
          value={d.category}
          onChange={(v: PayableCategory) => set("category", v)}
          options={Object.entries(PAYABLE_CATEGORIES).map(([value, m]) => ({ value: value as PayableCategory, label: m.label, color: MODULES.payables.color }))}
        />
      </Field>
      <Field label="Name" htmlFor="payable-name">
        <TextInput
          id="payable-name"
          placeholder={d.category === "loan" ? "e.g. Car loan" : d.category === "insurance" ? "e.g. Health insurance" : d.category === "subscription" ? "e.g. Netflix" : "e.g. Electricity"}
          value={d.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <FormGrid>
        <Field label="Due day of month" htmlFor="payable-due">
          <NumberInput id="payable-due" min={1} max={31} step={1} value={d.dueDay} onChange={(v) => set("dueDay", Math.max(1, Math.min(31, Math.round(v ?? 1))))} />
        </Field>
        <Field label="Status" htmlFor="payable-status">
          <Select<PayableStatus>
            id="payable-status"
            value={d.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
            ]}
          />
        </Field>
      </FormGrid>

      {d.category === "loan" ? (
        <FormSection title="Loan details">
          <FormGrid>
            <Field label="Total principal" htmlFor="loan-principal">
              <NumberInput id="loan-principal" min={0} value={loan.principal || undefined} onChange={(v) => set("loan", { ...loan, principal: v ?? 0 })} />
            </Field>
            <Field label="Remaining balance" htmlFor="loan-remaining" hint={loan.remainingBalance > loan.principal ? "Can't be more than the principal." : undefined}>
              <NumberInput id="loan-remaining" min={0} value={loan.remainingBalance || undefined} onChange={(v) => set("loan", { ...loan, remainingBalance: v ?? 0 })} />
            </Field>
            <Field label="Interest rate (optional)" htmlFor="loan-rate">
              <NumberInput id="loan-rate" min={0} suffix="%" value={loan.interestRate} onChange={(v) => set("loan", { ...loan, interestRate: v })} />
            </Field>
            <Field label="End date" htmlFor="loan-end">
              <TextInput id="loan-end" type="date" value={loan.endDate ?? ""} onChange={(e) => set("loan", { ...loan, endDate: e.target.value })} />
            </Field>
          </FormGrid>
        </FormSection>
      ) : null}

      {d.category === "insurance" ? (
        <FormSection title="Insurance details">
          <FormGrid>
            <Field label="Provider" htmlFor="ins-provider">
              <TextInput id="ins-provider" placeholder="e.g. Sun Life" value={insurance.provider} onChange={(e) => set("insurance", { ...insurance, provider: e.target.value })} />
            </Field>
            <Field label="Coverage type" htmlFor="ins-coverage">
              <TextInput id="ins-coverage" placeholder="e.g. Health, Life, Car" value={insurance.coverageType} onChange={(e) => set("insurance", { ...insurance, coverageType: e.target.value })} />
            </Field>
            <Field label="Payment frequency" htmlFor="ins-freq">
              <Select<PaymentFrequency>
                id="ins-freq"
                value={insurance.paymentFrequency}
                onChange={(v) => set("insurance", { ...insurance, paymentFrequency: v })}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "semi-annual", label: "Every 6 months" },
                  { value: "annual", label: "Yearly" },
                ]}
              />
            </Field>
            <Field label="Renewal date" htmlFor="ins-renewal">
              <TextInput id="ins-renewal" type="date" value={insurance.renewalDate ?? ""} onChange={(e) => set("insurance", { ...insurance, renewalDate: e.target.value })} />
            </Field>
          </FormGrid>
        </FormSection>
      ) : null}
    </form>
  );
}
