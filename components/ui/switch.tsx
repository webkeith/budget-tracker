"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors",
        checked ? "bg-income" : "bg-white/[0.16]",
      )}
    >
      <motion.span
        layout
        transition={spring}
        className={cn("block size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]", checked ? "ml-auto" : "ml-0")}
      />
    </button>
  );
}
