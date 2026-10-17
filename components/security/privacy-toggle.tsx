"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/lib/privacy";
import { cn } from "@/lib/utils";

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show numbers" : "Hide numbers"}
      aria-keyshortcuts="h"
      title={hidden ? "Show numbers (H)" : "Hide numbers (H)"}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border transition-colors",
        hidden ? "border-accent/40 bg-accent/15 text-accent" : "border-border bg-white/[0.04] text-fg-2 hover:text-fg",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={hidden ? "off" : "on"} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
          {hidden ? <EyeOff className="size-[18px]" strokeWidth={1.75} /> : <Eye className="size-[18px]" strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
