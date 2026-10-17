"use client";

import { motion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, CircleDashed, Clock, MinusCircle, PencilLine } from "lucide-react";
import type { Client, Payout } from "@/types";
import { useStore } from "@/lib/store";
import { isoDate, materializePayout } from "@/lib/clients";
import { formatDate, uid } from "@/lib/format";
import { itemVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Money, useFormatMoney } from "@/components/ui/money";

export function ClientAvatar({ client, size = 40 }: { client: Pick<Client, "name" | "color">; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * 0.42,
        color: client.color,
        backgroundColor: `color-mix(in srgb, ${client.color} 14%, transparent)`,
      }}
    >
      {client.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function PayoutChip({ payout, today = isoDate(new Date()) }: { payout: Payout; today?: string }) {
  switch (payout.status) {
    case "received":
      return <Chip color="var(--income)" icon={CheckCircle2}>Received</Chip>;
    case "skipped":
      return <Chip icon={MinusCircle}>Skipped</Chip>;
    case "needs-amount":
      return payout.periodEnd > today ? <Chip icon={CircleDashed}>Upcoming</Chip> : <Chip color="var(--due-soon)" icon={PencilLine}>Needs amount</Chip>;
    default:
      return payout.periodEnd < today ? <Chip color="var(--payable)" icon={AlertCircle}>Overdue</Chip> : <Chip color="var(--savings)" icon={Clock}>Expected</Chip>;
  }
}

export function periodLabel(p: Pick<Payout, "periodStart" | "periodEnd">) {
  const s = new Date(`${p.periodStart}T00:00:00`);
  const e = new Date(`${p.periodEnd}T00:00:00`);
  const sameMonth = s.getMonth() === e.getMonth();
  const start = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = e.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${start} – ${end}`;
}

export function PayoutRow({ payout, client, showClient = false }: { payout: Payout; client?: Client; showClient?: boolean }) {
  const { openClientSheet, upsert, toast } = useStore();
  const fmt = useFormatMoney();
  const today = isoDate(new Date());
  const payday = formatDate(payout.periodEnd, { weekday: "short", month: "short", day: "numeric" });
  const canMarkReceived = payout.status === "expected";
  const needsAmount = payout.status === "needs-amount" && payout.periodEnd <= today;

  const open = () => {
    if (!client) return;
    if (payout.status === "needs-amount") openClientSheet({ kind: "log", clientId: client.id, payout });
    else openClientSheet({ kind: "payout", clientId: client.id, payout });
  };

  const subtitle =
    payout.status === "received"
      ? [payout.dateReceived ? `Received ${formatDate(payout.dateReceived, { month: "short", day: "numeric" })}` : "Received", payout.hours ? `${payout.hours} hrs` : null]
          .filter(Boolean)
          .join(" · ")
      : payout.payType === "variable"
        ? `Week of ${periodLabel(payout)}`
        : `Payday ${payday}`;

  return (
    <motion.li variants={itemVariants} layout="position" className="list-none">
      <div className={cn("flex items-center gap-1 rounded-[14px]", needsAmount && "bg-due/[0.05]", payout.status === "expected" && payout.periodEnd < today && "bg-payable/[0.05]")}>
        <button
          type="button"
          onClick={open}
          className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-[background-color,transform] hover:bg-white/[0.04] active:scale-[0.99]"
        >
          {client && showClient ? (
            <ClientAvatar client={client} />
          ) : (
            <span aria-hidden className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[11px] bg-white/[0.05] leading-none">
              <span className="text-[10px] font-semibold uppercase text-fg-2">{new Date(`${payout.periodEnd}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span>
              <span className="num mt-0.5 text-[15px] font-semibold">{Number(payout.periodEnd.slice(8, 10))}</span>
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{showClient && client ? client.name : payday}</span>
            <span className="block truncate text-[13px] text-fg-2">{showClient ? `${payday} · ${subtitle}` : subtitle}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {payout.status === "needs-amount" ? (
              <span className="text-[15px] font-semibold text-fg-2">—</span>
            ) : (
              <Money value={payout.amount} className={cn("text-[15px] font-semibold", payout.status === "skipped" && "text-fg-2")} tone={payout.status === "received" ? "income" : undefined} />
            )}
            <PayoutChip payout={payout} today={today} />
          </span>
        </button>
        {canMarkReceived && client ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            aria-label={`Mark ${client.name} payout on ${payday} as received`}
            onClick={() => {
              upsert("incomes", materializePayout(payout, { status: "received", dateReceived: today }, uid));
              toast(`${fmt(payout.amount)} from ${client.name} received`, "success");
            }}
            className="mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full border-[1.5px] border-white/25 text-transparent transition-colors hover:border-income hover:text-income">
              <Check className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
          </motion.button>
        ) : needsAmount && client ? (
          <button
            type="button"
            onClick={open}
            className="mr-1 inline-flex h-9 shrink-0 items-center rounded-full bg-due/15 px-3.5 text-[13px] font-semibold text-due hover:bg-due/20"
          >
            Log
          </button>
        ) : (
          <span className="mr-1 size-11 shrink-0" aria-hidden />
        )}
      </div>
    </motion.li>
  );
}
