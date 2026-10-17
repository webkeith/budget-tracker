import { AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import type { Affordability, PayableStatus } from "@/types";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  color = "var(--text-secondary)",
  className,
  icon: Icon,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", className)}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

export function StatusChip({ status, dueSoon }: { status: PayableStatus; dueSoon?: boolean }) {
  if (status === "paid") return <Chip color="var(--income)" icon={CheckCircle2}>Paid</Chip>;
  if (status === "overdue") return <Chip color="var(--payable)" icon={AlertCircle}>Overdue</Chip>;
  if (dueSoon) return <Chip color="var(--due-soon)" icon={Clock}>Due soon</Chip>;
  return <Chip icon={Circle}>Unpaid</Chip>;
}

export function AffordChip({ value }: { value: Affordability }) {
  if (value === "affordable") return <Chip color="var(--income)" icon={CheckCircle2}>Affordable now</Chip>;
  if (value === "on-track") return <Chip color="var(--savings)" icon={Clock}>On track</Chip>;
  return <Chip color="var(--due-soon)" icon={Circle}>Not yet</Chip>;
}
