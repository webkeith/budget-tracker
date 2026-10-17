"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const FORM_ID = "entry-form";

export function useDraft<T extends object>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setDraft((d) => ({ ...d, [key]: value }));
  return [draft, set, setDraft] as const;
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-2 rounded-[16px] border border-border bg-white/[0.02] p-4">
      <legend className="px-1 text-[13px] font-semibold text-fg">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ChoicePills<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; color?: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] font-medium transition-colors",
              active ? "border-transparent text-fg" : "border-border text-fg-2 hover:border-border-strong hover:text-fg",
            )}
            style={active ? { backgroundColor: `color-mix(in srgb, ${o.color ?? "#0A84FF"} 22%, transparent)` } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface FormProps<T> {
  item?: T;
  preset?: Record<string, unknown>;
  onSubmit: (item: T) => void;
  onValidChange: (valid: boolean) => void;
}
