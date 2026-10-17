"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { itemVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ListRow({
  icon,
  color,
  title,
  subtitle,
  right,
  below,
  onClick,
  trailing,
  className,
}: {
  icon: LucideIcon;
  color: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  below?: React.ReactNode;
  onClick?: () => void;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} color={color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-fg">{title}</p>
          {subtitle ? <div className="mt-0.5 truncate text-[13px] text-fg-2">{subtitle}</div> : null}
        </div>
        {right ? <div className="flex shrink-0 flex-col items-end gap-1 text-right">{right}</div> : null}
      </div>
      {below ? <div className="mt-3 pl-[52px]">{below}</div> : null}
    </>
  );
  const body = onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "block min-h-[60px] w-full rounded-[14px] px-3 py-3 text-left transition-[background-color,transform] hover:bg-white/[0.04] active:scale-[0.99]",
            !trailing && className,
          )}
        >
          {content}
        </button>
      ) : (
        <div className={cn("px-3 py-3", className)}>{content}</div>
      );
  return (
    <motion.li variants={itemVariants} layout="position" className="list-none">
      {trailing ? (
        <div className={cn("flex items-center gap-1 rounded-[14px]", className)}>
          <div className="min-w-0 flex-1">{body}</div>
          <div className="shrink-0 pr-1">{trailing}</div>
        </div>
      ) : (
        body
      )}
    </motion.li>
  );
}

export function ListGroup({
  title,
  total,
  children,
  id,
  action,
}: {
  title?: React.ReactNode;
  total?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.section variants={itemVariants} id={id} className="card scroll-mt-24 p-2">
      {title ? (
        <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-2">{title}</h2>
          <div className="flex items-center gap-2">
            {total ? <span className="text-[14px] font-medium text-fg">{total}</span> : null}
            {action}
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-white/[0.05]">{children}</ul>
    </motion.section>
  );
}

export function StatTile({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={cn("card p-4 md:p-5", className)}>
      <p className="label">{label}</p>
      <div className="mt-1 text-[24px] font-semibold md:text-[28px]">{children}</div>
      {hint ? <div className="mt-1 text-[13px] text-fg-2">{hint}</div> : null}
    </motion.div>
  );
}
