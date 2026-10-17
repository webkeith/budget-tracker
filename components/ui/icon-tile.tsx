import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconTile({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "size-8 rounded-[9px]" : size === "lg" ? "size-12 rounded-[14px]" : "size-10 rounded-[11px]";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center", dims, className)}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <Icon className={icon} strokeWidth={1.5} />
    </span>
  );
}
