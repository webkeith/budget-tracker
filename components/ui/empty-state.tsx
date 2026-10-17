"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export function EmptyState({
  icon,
  color,
  title,
  example,
  cta,
  onAction,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  example: string;
  cta: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <IconTile icon={icon} color={color} size="lg" />
      <p className="mt-4 text-[17px] font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-xs text-[14px] text-fg-2">
        For example: <span className="text-fg">{example}</span>
      </p>
      <Button className="mt-5" onClick={onAction}>
        <Plus aria-hidden />
        {cta}
      </Button>
    </div>
  );
}
