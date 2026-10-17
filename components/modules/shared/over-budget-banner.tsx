"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { remainingBalance } from "@/lib/calculations";
import { Money } from "@/components/ui/money";
import { itemVariants } from "@/lib/motion";

export function OverBudgetBanner() {
  const { data, month } = useStore();
  const left = remainingBalance(data, month);
  if (left >= 0) return null;
  return (
    <motion.div
      variants={itemVariants}
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-[16px] border border-payable/25 bg-payable/10 px-4 py-3"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-payable" strokeWidth={1.75} />
      <p className="text-[14px] text-fg">
        You&apos;re spending more than you earn this month by <Money value={Math.abs(left)} className="font-semibold text-payable" symbolClassName="text-payable" />.
        <span className="text-fg-2"> Consider pausing a contribution or trimming a want.</span>
      </p>
    </motion.div>
  );
}
