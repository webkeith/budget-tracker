"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/lib/motion";

export const Card = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { interactive?: boolean }>(
  ({ className, interactive, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={itemVariants}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={cn("card", interactive && "cursor-pointer transition-[border-color,background-color] hover:border-border-strong hover:bg-card-hover", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-fg-2">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
