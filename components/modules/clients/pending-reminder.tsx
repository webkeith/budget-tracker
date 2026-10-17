"use client";

import { motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { useStore } from "@/lib/store";
import { pendingVariablePayouts } from "@/lib/clients";
import { itemVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PendingReminder({ className }: { className?: string }) {
  const { data, openClientSheet } = useStore();
  const pending = pendingVariablePayouts(data);
  if (!pending.length) return null;
  const first = pending[0];
  const client = data.clients.find((c) => c.id === first.clientId);
  return (
    <motion.div variants={itemVariants} className={cn("flex flex-wrap items-center gap-3 rounded-[16px] border border-due/25 bg-due/10 px-4 py-3", className)} role="status">
      <BellRing className="size-5 shrink-0 text-due" strokeWidth={1.75} aria-hidden />
      <p className="min-w-0 flex-1 text-[14px]">
        <span className="font-semibold">
          {pending.length} client payment{pending.length === 1 ? "" : "s"} to log
        </span>
        <span className="text-fg-2"> · {client ? `${client.name} first` : "tap to add amounts"}</span>
      </p>
      {client ? (
        <Button size="sm" variant="tinted" className="h-9 bg-due/20 text-due hover:bg-due/25" onClick={() => openClientSheet({ kind: "log", clientId: client.id, payout: first })}>
          Log now
        </Button>
      ) : null}
    </motion.div>
  );
}

