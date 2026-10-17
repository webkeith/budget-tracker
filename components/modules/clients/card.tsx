"use client";

import { motion } from "framer-motion";
import { CalendarClock, ChevronRight, CircleSlash, PauseCircle } from "lucide-react";
import type { Client } from "@/types";
import { useStore } from "@/lib/store";
import { clientAveragePayout, clientEndDate, clientMonthlyIncome, currentRate, scheduleLabel } from "@/lib/clients";
import { formatDate } from "@/lib/format";
import { itemVariants } from "@/lib/motion";
import { Chip } from "@/components/ui/chip";
import { Money } from "@/components/ui/money";
import { ClientAvatar } from "@/components/modules/clients/parts";
import { COLORS } from "@/lib/colors";

export function ClientCard({ client }: { client: Client }) {
  const { data, month, openClientSheet } = useStore();
  const thisMonth = clientMonthlyIncome(data, client, month);
  const avg = client.payType === "variable" ? clientAveragePayout(data, client, month) : 0;
  const end = clientEndDate(client);

  return (
    <motion.li variants={itemVariants} className="list-none">
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => openClientSheet({ kind: "detail", clientId: client.id })}
        className="card flex h-full w-full flex-col p-5 text-left transition-colors hover:border-border-strong"
      >
        <div className="flex items-start gap-3">
          <ClientAvatar client={client} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{client.name}</p>
            <p className="truncate text-[13px] text-fg-2">{client.company ?? scheduleLabel(client.schedule)}</p>
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-fg-3" aria-hidden />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip color={client.payType === "fixed" ? COLORS.income : COLORS.savings}>{client.payType === "fixed" ? "Fixed" : "Hourly"}</Chip>
          {client.status === "paused" ? (
            <Chip color="var(--due-soon)" icon={PauseCircle}>Paused</Chip>
          ) : client.status === "terminated" ? (
            <Chip icon={CircleSlash}>Ended {end ? formatDate(end, { month: "short", day: "numeric", year: "numeric" }) : ""}</Chip>
          ) : (
            <Chip icon={CalendarClock}>{scheduleLabel(client.schedule)}</Chip>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-4">
          <div>
            <dt className="label">{client.payType === "fixed" ? "Per payout" : avg ? "Avg payout" : "Hourly rate"}</dt>
            <dd className="mt-0.5 text-[16px] font-semibold">
              {client.payType === "fixed" ? (
                <Money value={currentRate(client)} />
              ) : avg ? (
                <Money value={Math.round(avg)} />
              ) : client.hourlyRate ? (
                <>
                  <Money value={client.hourlyRate} />
                  <span className="text-[13px] font-normal text-fg-2">/hr</span>
                </>
              ) : (
                <span className="text-fg-2">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="label">This month</dt>
            <dd className="mt-0.5 text-[16px] font-semibold">
              <Money value={thisMonth} tone={thisMonth > 0 ? "income" : undefined} />
            </dd>
          </div>
        </dl>
      </motion.button>
    </motion.li>
  );
}
