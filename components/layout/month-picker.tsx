"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addMonths, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MonthPicker({ className }: { className?: string }) {
  const { month, setMonth, currentMonth } = useStore();
  const isCurrent = month === currentMonth;
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border bg-white/[0.04]", className)}>
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => setMonth(addMonths(month, -1))}
        className="inline-flex size-11 items-center justify-center rounded-full text-fg-2 transition-colors hover:text-fg"
      >
        <ChevronLeft className="size-[18px]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => setMonth(currentMonth)}
        className="num min-w-[118px] text-center text-[14px] font-medium"
        aria-live="polite"
        title={isCurrent ? "This month" : "Jump to this month"}
      >
        {monthLabel(month, "long")}
        {!isCurrent ? <span className="sr-only"> (tap to return to this month)</span> : null}
      </button>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => setMonth(addMonths(month, 1))}
        className="inline-flex size-11 items-center justify-center rounded-full text-fg-2 transition-colors hover:text-fg"
      >
        <ChevronRight className="size-[18px]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
