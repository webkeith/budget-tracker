"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ModuleKey } from "@/types";
import { useStore } from "@/lib/store";
import { MODULES } from "@/lib/modules";
import { Sheet } from "@/components/ui/sheet";
import { IconTile } from "@/components/ui/icon-tile";

const ORDER: { module: ModuleKey; hint: string }[] = [
  { module: "clients", hint: "Someone who pays you, fixed or hourly" },
  { module: "income", hint: "Salary, client payment, one-off income" },
  { module: "payables", hint: "Bills, loans, insurance, subscriptions" },
  { module: "expenses", hint: "Groceries, transport, dining" },
  { module: "responsibilities", hint: "Family, tuition, pets" },
  { module: "savings", hint: "Emergency fund or a goal" },
  { module: "investments", hint: "Stocks, MP2, funds, crypto" },
  { module: "planning", hint: "Something you want to buy" },
  { module: "assets", hint: "Bank, cash, car, property" },
];

export function QuickAdd() {
  const { quickAddOpen, setQuickAddOpen, openEditor, editor } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !editor) {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setQuickAddOpen, editor]);

  return (
    <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen} title="Add entry" description="What would you like to add?">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ORDER.map(({ module, hint }, i) => {
          const meta = MODULES[module];
          return (
            <motion.li key={module} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
              <button
                type="button"
                onClick={() => openEditor({ module })}
                className="flex min-h-16 w-full items-center gap-3 rounded-[16px] border border-border bg-white/[0.03] px-3.5 py-3 text-left transition-[background-color,border-color,transform] hover:border-border-strong hover:bg-white/[0.06] active:scale-[0.98]"
              >
                <IconTile icon={meta.icon} color={meta.color} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{meta.title}</span>
                  <span className="block truncate text-[13px] text-fg-2">{hint}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-fg-3" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Sheet>
  );
}
