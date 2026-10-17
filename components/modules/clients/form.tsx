"use client";

import { useEffect, useMemo, useState } from "react";
import type { Client, ClientPayType, PaySchedule, Weekday } from "@/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { currentRate, isoDate, payoutsPerMonthEstimate, scheduleLabel, suggestColor, WEEKDAYS } from "@/lib/clients";
import { MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useFormatMoney } from "@/components/ui/money";
import { ChoicePills, FORM_ID, FormGrid, FormSection, type FormProps } from "@/components/modules/shared/form-kit";

type Kind = PaySchedule["kind"];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}` }));

function nextWeekday(weekday: number) {
  const d = new Date();
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

function defaultSchedule(kind: Kind): PaySchedule {
  switch (kind) {
    case "weekly":
      return { kind, weekday: 5 };
    case "biweekly":
      return { kind, anchor: nextWeekday(5) };
    case "semimonthly":
      return { kind, day1: 15, day2: "last" };
    case "monthly":
      return { kind, day: "last" };
  }
}

export function ClientForm({ item, onSubmit, onValidChange }: FormProps<Client>) {
  const { data } = useStore();
  const fmt = useFormatMoney();
  const today = isoDate(new Date());
  const existingRate = item ? currentRate(item) : 0;

  const [name, setName] = useState(item?.name ?? "");
  const [company, setCompany] = useState(item?.company ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [payType, setPayType] = useState<ClientPayType>(item?.payType ?? "fixed");
  const [schedule, setSchedule] = useState<PaySchedule>(item?.schedule ?? defaultSchedule("semimonthly"));
  const [amount, setAmount] = useState<number | undefined>(item ? (item.payType === "fixed" ? existingRate : item.hourlyRate) : undefined);
  const [rateFrom, setRateFrom] = useState(today);
  const [start, setStart] = useState(item?.periods[0]?.start ?? today);
  const [backfill, setBackfill] = useState(item?.backfill ?? false);

  const rateChanged = Boolean(item && payType === "fixed" && item.payType === "fixed" && amount !== existingRate);
  const valid = name.trim().length > 0 && (payType === "variable" || (amount ?? 0) > 0) && Boolean(start);
  useEffect(() => onValidChange(valid), [valid, onValidChange]);

  const monthlyEstimate = useMemo(() => (payType === "fixed" && amount ? amount * payoutsPerMonthEstimate(schedule) : 0), [payType, amount, schedule]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    let rates = item?.rates ?? [];
    if (payType === "fixed") {
      if (!item || item.payType !== "fixed" || !rates.length) rates = [{ amount: amount!, from: start }];
      else if (rateChanged) rates = [...rates.filter((r) => r.from !== rateFrom), { amount: amount!, from: rateFrom }].sort((a, b) => a.from.localeCompare(b.from));
    }
    const periods = item ? item.periods.map((p, i) => (i === 0 ? { ...p, start } : p)) : [{ start }];
    const client: Client = {
      id: item?.id ?? uid(),
      name: name.trim(),
      company: company.trim() || undefined,
      notes: notes.trim() || undefined,
      color: item?.color ?? suggestColor(data.clients),
      payType,
      schedule,
      rates,
      hourlyRate: payType === "variable" ? amount || undefined : item?.hourlyRate,
      periods,
      status: item?.status ?? "active",
      endReason: item?.endReason,
      endNote: item?.endNote,
      trackFrom: item?.trackFrom ?? today,
      backfill: payType === "fixed" && start < (item?.trackFrom ?? today) ? backfill : false,
    };
    onSubmit(client);
  };

  const kind = schedule.kind;

  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={submit}>
      <Field label="Pay type">
        <ChoicePills
          label="Pay type"
          value={payType}
          onChange={(v: ClientPayType) => {
            setPayType(v);
            if (v === "variable" && schedule.kind === "semimonthly" && !item) setSchedule(defaultSchedule("weekly"));
          }}
          options={[
            { value: "fixed", label: "Fixed amount", color: MODULES.clients.color },
            { value: "variable", label: "Logged hours (varies)", color: MODULES.clients.color },
          ]}
        />
      </Field>

      <AmountInput
        id="client-amount"
        label={payType === "fixed" ? "Amount per payout" : "Hourly rate (optional)"}
        value={amount || undefined}
        onChange={setAmount}
        color={MODULES.clients.color}
        autoFocus={!item}
      />
      {payType === "fixed" && monthlyEstimate > 0 ? (
        <p className="-mt-1 text-center text-[13px] text-fg-2">About {fmt(Math.round(monthlyEstimate))} a month · paydays are counted exactly each month</p>
      ) : payType === "variable" ? (
        <p className="-mt-1 text-center text-[13px] text-fg-2">No fixed amount. We&apos;ll ask how much you received each payday.</p>
      ) : null}

      {rateChanged ? (
        <Field label="New rate starts on" htmlFor="client-rate-from" hint="Earlier payouts keep the old rate.">
          <TextInput id="client-rate-from" type="date" value={rateFrom} onChange={(e) => setRateFrom(e.target.value || today)} />
        </Field>
      ) : null}

      <FormGrid>
        <Field label="Client name" htmlFor="client-name">
          <TextInput id="client-name" placeholder="e.g. Acme Studio" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Company or project (optional)" htmlFor="client-company">
          <TextInput id="client-company" placeholder="e.g. Website retainer" value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
      </FormGrid>

      <FormSection title="When they pay">
        <div className="space-y-4">
          <Field label="Schedule" htmlFor="client-schedule">
            <Select<Kind>
              id="client-schedule"
              value={kind}
              onChange={(k) => setSchedule(defaultSchedule(k))}
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "semimonthly", label: "Twice a month (bi-monthly)" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </Field>
          {schedule.kind === "weekly" ? (
            <Field label="Payday" htmlFor="client-weekday">
              <Select
                id="client-weekday"
                value={String(schedule.weekday)}
                onChange={(v) => setSchedule({ kind: "weekly", weekday: Number(v) as Weekday })}
                options={WEEKDAYS.map((label, value) => ({ value: String(value), label }))}
              />
            </Field>
          ) : null}
          {schedule.kind === "biweekly" ? (
            <Field label="A recent or upcoming payday" htmlFor="client-anchor" hint="We count every 14 days from this date.">
              <TextInput id="client-anchor" type="date" value={schedule.anchor} onChange={(e) => e.target.value && setSchedule({ kind: "biweekly", anchor: e.target.value })} />
            </Field>
          ) : null}
          {schedule.kind === "semimonthly" ? (
            <FormGrid>
              <Field label="First payday" htmlFor="client-day1">
                <Select id="client-day1" value={String(schedule.day1)} onChange={(v) => setSchedule({ ...schedule, day1: Number(v) })} options={DAY_OPTIONS.slice(0, 28)} />
              </Field>
              <Field label="Second payday" htmlFor="client-day2">
                <Select
                  id="client-day2"
                  value={String(schedule.day2)}
                  onChange={(v) => setSchedule({ ...schedule, day2: v === "last" ? "last" : Number(v) })}
                  options={[{ value: "last", label: "Last day of the month" }, ...DAY_OPTIONS.slice(1, 30)]}
                />
              </Field>
            </FormGrid>
          ) : null}
          {schedule.kind === "monthly" ? (
            <Field label="Payday" htmlFor="client-day">
              <Select
                id="client-day"
                value={String(schedule.day)}
                onChange={(v) => setSchedule({ kind: "monthly", day: v === "last" ? "last" : Number(v) })}
                options={[{ value: "last", label: "Last day of the month" }, ...DAY_OPTIONS]}
              />
            </Field>
          ) : null}
          <p className="text-[13px] text-fg-2">{scheduleLabel(schedule)}</p>
        </div>
      </FormSection>

      <Field label="Working together since" htmlFor="client-start">
        <TextInput id="client-start" type="date" value={start} onChange={(e) => setStart(e.target.value || today)} />
      </Field>

      {payType === "fixed" && start < (item?.trackFrom ?? today) ? (
        <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-white/[0.02] px-4 py-3">
          <div>
            <label htmlFor="client-backfill" className="text-[15px] font-medium">
              Count earlier payouts as received
            </label>
            <p className="text-[13px] text-fg-2">Fills in past paydays so your history and trends include them.</p>
          </div>
          <Switch id="client-backfill" label="Count earlier payouts as received" checked={backfill} onChange={setBackfill} />
        </div>
      ) : null}

      <Field label="Notes" htmlFor="client-notes">
        <TextArea id="client-notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </form>
  );
}
