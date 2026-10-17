"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { spring } from "@/lib/motion";

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warning" ? AlertTriangle : Info;
          const color = t.tone === "success" ? "var(--income)" : t.tone === "warning" ? "var(--due-soon)" : "var(--accent)";
          return (
            <motion.button
              key={t.id}
              layout
              type="button"
              onClick={() => dismissToast(t.id)}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={spring}
              className="glass pointer-events-auto flex min-h-11 items-center gap-2.5 rounded-full border border-border px-4 py-2.5 text-[14px] font-medium shadow-float"
            >
              <Icon aria-hidden className="size-[18px]" style={{ color }} strokeWidth={1.75} />
              {t.message}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
