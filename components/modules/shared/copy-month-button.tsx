"use client";

import { CopyPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { addMonths, monthLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function CopyMonthButton() {
  const { copyToNextMonth, toast, month } = useStore();
  const next = monthLabel(addMonths(month, 1), "short");
  return (
    <Button
      variant="secondary"
      size="sm"
      className="h-11"
      onClick={() => {
        const n = copyToNextMonth();
        toast(n > 0 ? `Copied ${n} recurring ${n === 1 ? "item" : "items"} to ${next}` : `${next} already has these items`, n > 0 ? "success" : "default");
      }}
    >
      <CopyPlus aria-hidden />
      <span>Copy to {next}</span>
    </Button>
  );
}
