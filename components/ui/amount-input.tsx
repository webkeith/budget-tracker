"use client";

import { useEffect, useRef, useState } from "react";
import { useMoney } from "@/lib/store";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

function toDisplay(raw: string, locale: string) {
  if (!raw) return "";
  const [int, dec] = raw.split(".");
  const intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(int || "0"));
  return dec !== undefined ? `${intFmt}.${dec}` : intFmt;
}

export function AmountInput({
  value,
  onChange,
  label,
  color = "var(--text-primary)",
  autoFocus,
  id,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
  color?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const { currency, locale } = useMoney();
  const [raw, setRaw] = useState(value !== undefined && value !== 0 ? String(value) : "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = raw === "" ? undefined : Number(raw);
    if (current !== value) setRaw(value !== undefined && value !== 0 ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 250);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const display = toDisplay(raw, locale);
  const len = Math.max(display.length, 1);
  const size = len > 12 ? 34 : len > 9 ? 42 : 52;

  return (
    <div
      className="flex cursor-text flex-col items-center rounded-[20px] border border-border bg-white/[0.03] px-4 pb-5 pt-4 focus-within:border-accent"
      onClick={() => ref.current?.focus()}
    >
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="mt-1 flex items-baseline justify-center" style={{ color }}>
        <span className="mr-1 font-medium text-fg-2" style={{ fontSize: size * 0.6 }}>
          {currencySymbol(currency, locale)}
        </span>
        <input
          ref={ref}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={display}
          onChange={(e) => {
            let next = e.target.value.replace(/[^0-9.]/g, "");
            const firstDot = next.indexOf(".");
            if (firstDot !== -1) next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
            next = next.replace(/^0+(?=\d)/, "");
            setRaw(next);
            onChange(next === "" || next === "." ? undefined : Number(next));
          }}
          className={cn("num min-w-[1ch] bg-transparent text-center font-semibold outline-none placeholder:text-fg-3")}
          style={{ fontSize: size, width: `${len + 0.6}ch`, lineHeight: 1.1, fontFamily: "var(--font-display)" }}
        />
      </div>
    </div>
  );
}
