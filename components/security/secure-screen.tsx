"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppMark({ size = 56 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[16px] bg-gradient-to-br from-accent to-investments shadow-[0_10px_30px_rgba(10,132,255,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden
    >
      <Wallet className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={1.75} />
    </span>
  );
}

export function SecureScreen({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="mesh-glow pointer-events-none absolute inset-0 opacity-70" />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn("relative w-full", wide ? "max-w-lg" : "max-w-sm", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/60" : "w-1.5 bg-white/15")} />
      ))}
    </div>
  );
}

export function Avatar({ name, src, size = 64 }: { name?: string; src?: string; size?: number }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" width={size} height={size} className="rounded-full object-cover ring-1 ring-white/10" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-assets to-investments font-semibold text-white ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}
