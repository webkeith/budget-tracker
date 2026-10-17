"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CirclePlay, CircleSlash, PauseCircle, Pencil, Receipt, RotateCcw, Trash2 } from "lucide-react";
import type { Client, Payout, PayoutStatus, TerminationReason } from "@/types";
import { useStore, type ClientSheetState } from "@/lib/store";
import { usePrivacy } from "@/lib/privacy";
import {
  TERMINATION_REASONS,
  clientAveragePayout,
  clientEndDate,
  clientHistory,
  clientHoursInMonth,
  clientMonthlyIncome,
  clientReceivedInMonth,
  clientTotalEarned,
  currentRate,
  isoDate,
  materializePayout,
  nextPayoutToLog,
  pauseClient,
  reactivateClient,
  scheduleLabel,
  terminateClient,
} from "@/lib/clients";
import { addMonths, formatDate, monthLabel, uid } from "@/lib/format";
import { COLORS } from "@/lib/colors";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, NumberInput, Select, TextArea, TextInput } from "@/components/ui/field";
import { Money, useFormatMoney } from "@/components/ui/money";
import { Chip } from "@/components/ui/chip";
import { ChoicePills, FormGrid } from "@/components/modules/shared/form-kit";
import { ClientAvatar, PayoutRow, periodLabel } from "@/components/modules/clients/parts";

export function ClientSheets() {
  const { clientSheet, closeClientSheet, data } = useStore();
  const [last, setLast] = useState<Record<string, ClientSheetState>>({});

  useEffect(() => {
    if (clientSheet) setLast((prev) => ({ ...prev, [clientSheet.kind]: clientSheet }));
  }, [clientSheet]);

  const resolve = (kind: ClientSheetState["kind"]) => {
    const state = clientSheet?.kind === kind ? clientSheet : last[kind];
    const client = state ? data.clients.find((c) => c.id === state.clientId) : undefined;
    const payout = state && "payout" in state ? state.payout : undefined;
    return { open: clientSheet?.kind === kind && Boolean(client), client, payout };
  };

  const detail = resolve("detail");
  const log = resolve("log");
  const payout = resolve("payout");
  const terminate = resolve("terminate");
  const reactivate = resolve("reactivate");

  return (
    <>
      <DetailSheet open={detail.open} client={detail.client} onClose={closeClientSheet} />
      <LogPaymentSheet open={log.open} client={log.client} payout={log.payout} onClose={closeClientSheet} />
      <PayoutSheet open={payout.open} client={payout.client} payout={payout.payout} onClose={closeClientSheet} />
      <TerminateSheet open={terminate.open} client={terminate.client} onClose={closeClientSheet} />
      <ReactivateSheet open={reactivate.open} client={reactivate.client} onClose={closeClientSheet} />
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-white/[0.04] px-3.5 py-3">
      <p className="label">{label}</p>
      <div className="mt-0.5 text-[17px] font-semibold">{children}</div>
    </div>
  );
}

function DetailSheet({ open, client, onClose }: { open: boolean; client?: Client; onClose: () => void }) {
  const { data, month, openEditor, openClientSheet, upsert, toast } = useStore();
  const { hidden } = usePrivacy();
  const fmt = useFormatMoney();

  const chart = useMemo(() => {
    if (!client) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(month, i - 5);
      return { label: monthLabel(m, "short").slice(0, 3), value: clientReceivedInMonth(data, client, m), current: i === 5 };
    });
  }, [client, data, month]);

  if (!client) return null;

  const history = clientHistory(data, client, new Date(), 12);
  const end = clientEndDate(client);
  const isVariable = client.payType === "variable";
  const next = nextPayoutToLog(data, client);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={client.name}
      description={client.company ?? scheduleLabel(client.schedule)}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="h-11" onClick={() => openEditor({ module: "clients", item: client as never })}>
            <Pencil aria-hidden />
            Edit
          </Button>
          {client.status === "active" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="h-11"
                onClick={() => {
                  upsert("clients", pauseClient(client, isoDate(new Date())));
                  toast(`${client.name} paused`);
                }}
              >
                <PauseCircle aria-hidden />
                Pause
              </Button>
              <Button variant="danger" size="sm" className="h-11" onClick={() => openClientSheet({ kind: "terminate", clientId: client.id })}>
                <CircleSlash aria-hidden />
                Terminate
              </Button>
            </>
          ) : (
            <Button variant="tinted" size="sm" className="h-11" onClick={() => openClientSheet({ kind: "reactivate", clientId: client.id })}>
              {client.status === "paused" ? <CirclePlay aria-hidden /> : <RotateCcw aria-hidden />}
              {client.status === "paused" ? "Resume" : "Reactivate"}
            </Button>
          )}
          {next && client.status === "active" ? (
            <Button size="sm" className="order-first h-11 w-full sm:order-none sm:ml-auto sm:w-auto" onClick={() => openClientSheet({ kind: "log", clientId: client.id, payout: next })}>
              <Receipt aria-hidden />
              Log payment
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <ClientAvatar client={client} size={52} />
        <div className="flex flex-wrap gap-1.5">
          <Chip color={client.payType === "fixed" ? COLORS.income : COLORS.savings}>{client.payType === "fixed" ? "Fixed" : "Hourly"}</Chip>
          <Chip>{scheduleLabel(client.schedule)}</Chip>
          {client.status === "paused" ? <Chip color="var(--due-soon)" icon={PauseCircle}>Paused</Chip> : null}
          {client.status === "terminated" ? <Chip icon={CircleSlash}>Ended {end ? formatDate(end) : ""}</Chip> : null}
        </div>
      </div>
      {client.status === "terminated" && (client.endReason || client.endNote) ? (
        <p className="mt-3 rounded-[12px] bg-white/[0.04] px-3 py-2.5 text-[13px] text-fg-2">
          {client.endReason ? <span className="font-medium text-fg">{TERMINATION_REASONS[client.endReason]}. </span> : null}
          {client.endNote}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="This month">
          <Money value={clientMonthlyIncome(data, client, month)} />
        </Stat>
        <Stat label="Total earned">
          <Money value={clientTotalEarned(data, client)} />
        </Stat>
        {isVariable ? (
          <>
            <Stat label="Avg payout (3 mo)">
              <Money value={Math.round(clientAveragePayout(data, client, month))} />
            </Stat>
            <Stat label={`Hours in ${monthLabel(month, "short").slice(0, 3)}`}>
              <span className="num">{clientHoursInMonth(data, client, month)}</span>
            </Stat>
          </>
        ) : (
          <>
            <Stat label="Per payout">
              <Money value={currentRate(client)} />
            </Stat>
            <Stat label="Since">
              <span className="text-[15px]">{formatDate(client.periods[0]?.start, { month: "short", year: "numeric" })}</span>
            </Stat>
          </>
        )}
      </div>

      <div className="mt-5">
        <p className="label mb-2">Received, last 6 months</p>
        <div className="h-[132px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="glass rounded-[10px] border border-border px-2.5 py-1.5 text-[12px] shadow-float">
                      <span className="text-fg-2">{label}: </span>
                      <span className="num font-medium">{hidden ? fmt(0) : fmt(Number(payload[0].value))}</span>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={28}>
                {chart.map((d) => (
                  <Cell key={d.label} fill={client.color} fillOpacity={d.current ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {client.notes ? <p className="mt-4 text-[14px] text-fg-2">{client.notes}</p> : null}

      <div className="mt-5">
        <p className="label mb-1">Payout history</p>
        {history.length ? (
          <ul className="-mx-2 divide-y divide-white/[0.05]">
            {history.map((p) => (
              <PayoutRow key={p.id} payout={p} client={client} />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-[14px] text-fg-2">No payouts yet.</p>
        )}
      </div>
    </Sheet>
  );
}

function LogPaymentSheet({ open, client, payout, onClose }: { open: boolean; client?: Client; payout?: Payout; onClose: () => void }) {
  const { upsert, toast } = useStore();
  const fmt = useFormatMoney();
  const [amount, setAmount] = useState<number | undefined>();
  const [hours, setHours] = useState<number | undefined>();
  const [date, setDate] = useState(isoDate(new Date()));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && payout) {
      setAmount(payout.status === "expected" ? payout.amount : undefined);
      setHours(payout.hours);
      setDate(isoDate(new Date()));
      setNote(payout.note ?? "");
    }
  }, [open, payout]);

  if (!client || !payout) return null;

  const suggested = client.hourlyRate && hours ? Math.round(client.hourlyRate * hours) : 0;
  const isVariable = client.payType === "variable";
  const range = isVariable ? `the week of ${periodLabel(payout)}` : `the ${formatDate(payout.periodEnd, { month: "short", day: "numeric" })} payday`;

  const save = (status: PayoutStatus) => {
    const changes =
      status === "skipped"
        ? { status, amount: 0, hours: undefined, dateReceived: undefined, note: note.trim() || undefined }
        : { status, amount: amount ?? 0, hours: hours || undefined, dateReceived: date, note: note.trim() || undefined };
    upsert("incomes", materializePayout(payout, changes, uid));
    toast(status === "skipped" ? `Skipped ${range}` : `${fmt(amount ?? 0)} from ${client.name} logged`, "success");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`How much did you receive from ${client.name}?`}
      description={`For ${range}.`}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => save("skipped")}>
            Skip this period
          </Button>
          <Button className="ml-auto min-w-32" disabled={!amount || amount <= 0} onClick={() => save("received")}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AmountInput id="log-amount" label="Amount received" value={amount} onChange={setAmount} color={client.color} autoFocus />
        {isVariable ? (
          <Field label="Hours logged (optional)" htmlFor="log-hours">
            <NumberInput id="log-hours" min={0} step={0.25} value={hours} onChange={setHours} suffix="hrs" />
          </Field>
        ) : null}
        {suggested > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-accent/10 px-4 py-3 text-[14px]">
            <span>
              ≈ <span className="num font-semibold">{fmt(suggested)}</span> at {fmt(client.hourlyRate!)}/hr
            </span>
            <Button size="sm" variant="tinted" onClick={() => setAmount(suggested)}>
              Use this
            </Button>
          </div>
        ) : null}
        <FormGrid>
          <Field label="Date received" htmlFor="log-date">
            <TextInput id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value || isoDate(new Date()))} />
          </Field>
          <Field label="Note (optional)" htmlFor="log-note">
            <TextInput id="log-note" placeholder="e.g. Sprint 14" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </FormGrid>
      </div>
    </Sheet>
  );
}

function PayoutSheet({ open, client, payout, onClose }: { open: boolean; client?: Client; payout?: Payout; onClose: () => void }) {
  const { upsert, remove, toast } = useStore();
  const [amount, setAmount] = useState<number | undefined>();
  const [status, setStatus] = useState<PayoutStatus>("received");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState<number | undefined>();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && payout) {
      setAmount(payout.amount || undefined);
      setStatus(payout.status);
      setDate(payout.dateReceived ?? isoDate(new Date()));
      setHours(payout.hours);
      setNote(payout.note ?? "");
    }
  }, [open, payout]);

  if (!client || !payout) return null;

  const save = () => {
    upsert(
      "incomes",
      materializePayout(
        payout,
        {
          status,
          amount: status === "skipped" ? 0 : amount ?? 0,
          dateReceived: status === "received" ? date : undefined,
          hours: hours || undefined,
          note: note.trim() || undefined,
        },
        uid,
      ),
    );
    toast("Payout updated", "success");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`${client.name} payout`}
      description={`Payday ${formatDate(payout.periodEnd, { weekday: "short", month: "short", day: "numeric" })} · ${periodLabel(payout)}`}
      footer={
        <div className="flex items-center gap-2">
          {!payout.virtual ? (
            <Button
              variant="ghost"
              className="text-payable hover:text-payable"
              onClick={() => {
                remove("incomes", payout.id);
                toast("Payout reset");
                onClose();
              }}
            >
              <Trash2 aria-hidden />
              Reset
            </Button>
          ) : null}
          <Button className="ml-auto min-w-32" onClick={save} disabled={status !== "skipped" && (!amount || amount <= 0)}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AmountInput id="payout-amount" label="Amount" value={amount} onChange={setAmount} color={client.color} />
        <Field label="Status">
          <ChoicePills
            label="Status"
            value={status}
            onChange={(v: PayoutStatus) => setStatus(v)}
            options={[
              { value: "received", label: "Received", color: COLORS.income },
              { value: "expected", label: "Expected", color: COLORS.savings },
              { value: "skipped", label: "Skipped", color: COLORS.textSecondary },
            ]}
          />
        </Field>
        <FormGrid>
          {status === "received" ? (
            <Field label="Date received" htmlFor="payout-date">
              <TextInput id="payout-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          ) : null}
          {client.payType === "variable" ? (
            <Field label="Hours logged" htmlFor="payout-hours">
              <NumberInput id="payout-hours" min={0} step={0.25} value={hours} onChange={setHours} suffix="hrs" />
            </Field>
          ) : null}
        </FormGrid>
        <Field label="Note" htmlFor="payout-note">
          <TextArea id="payout-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Sheet>
  );
}

function TerminateSheet({ open, client, onClose }: { open: boolean; client?: Client; onClose: () => void }) {
  const { data, mutate, toast } = useStore();
  const [endDate, setEndDate] = useState(isoDate(new Date()));
  const [reason, setReason] = useState<TerminationReason>("contract-ended");
  const [note, setNote] = useState("");
  const [keep, setKeep] = useState<"keep" | "remove">("keep");

  useEffect(() => {
    if (open) {
      setEndDate(isoDate(new Date()));
      setReason("contract-ended");
      setNote("");
      setKeep("keep");
    }
  }, [open]);

  if (!client) return null;

  const confirm = () => {
    const result = terminateClient(data, client, { endDate, reason, note: note.trim() || undefined, keepUnreceived: keep === "keep" }, uid);
    mutate((d) => {
      const removed = new Set(result.removeIds);
      return {
        ...d,
        clients: d.clients.map((c) => (c.id === client.id ? result.client : c)),
        incomes: [...d.incomes.filter((i) => !removed.has(i.id)), ...result.upserts],
      };
    });
    toast(`${client.name} moved to past clients`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Terminate ${client.name}?`}
      description="They'll stop creating new payouts. Past payouts and totals stay in your history."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm}>
            <CircleSlash aria-hidden />
            Terminate client
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="End date" htmlFor="term-date">
          <TextInput id="term-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value || isoDate(new Date()))} />
        </Field>
        <Field label="Reason (optional)">
          <ChoicePills
            label="Reason"
            value={reason}
            onChange={(v: TerminationReason) => setReason(v)}
            options={(Object.keys(TERMINATION_REASONS) as TerminationReason[]).map((k) => ({ value: k, label: TERMINATION_REASONS[k], color: COLORS.textSecondary }))}
          />
        </Field>
        <Field label="Note (optional)" htmlFor="term-note">
          <TextArea id="term-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Final invoice sent Oct 20" />
        </Field>
        <Field label="Unreceived payout after the end date" htmlFor="term-keep" hint="Keep it if they still owe you for work done up to the end date.">
          <Select<"keep" | "remove">
            id="term-keep"
            value={keep}
            onChange={setKeep}
            options={[
              { value: "keep", label: "Keep it as expected" },
              { value: "remove", label: "Remove it" },
            ]}
          />
        </Field>
      </div>
    </Sheet>
  );
}

function ReactivateSheet({ open, client, onClose }: { open: boolean; client?: Client; onClose: () => void }) {
  const { upsert, toast } = useStore();
  const [start, setStart] = useState(isoDate(new Date()));

  useEffect(() => {
    if (open) setStart(isoDate(new Date()));
  }, [open]);

  if (!client) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={client.status === "paused" ? `Resume ${client.name}` : `Reactivate ${client.name}`}
      description="Payouts start again from the date you pick. History stays as it is."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              upsert("clients", reactivateClient(client, start));
              toast(`${client.name} is active again`, "success");
              onClose();
            }}
          >
            <CirclePlay aria-hidden />
            {client.status === "paused" ? "Resume" : "Reactivate"}
          </Button>
        </div>
      }
    >
      <Field label="Start date" htmlFor="react-date">
        <TextInput id="react-date" type="date" value={start} onChange={(e) => setStart(e.target.value || isoDate(new Date()))} />
      </Field>
    </Sheet>
  );
}
