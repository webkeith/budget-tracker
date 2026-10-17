"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { passphraseStrength } from "@/lib/crypto";
import { cn } from "@/lib/utils";

const COLORS = ["#FF453A", "#FF453A", "#FF9F0A", "#30D158", "#30D158"];

export function PassphraseField({
  id,
  label,
  value,
  onChange,
  showStrength = false,
  autoFocus,
  placeholder,
  autoComplete = "current-password",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  showStrength?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const strength = passphraseStrength(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label px-0.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          spellCheck={false}
          placeholder={placeholder}
          className="h-12 w-full rounded-btn border border-border bg-white/[0.04] pl-3.5 pr-12 text-[15px] text-fg outline-none transition-colors hover:border-border-strong focus:border-accent focus:bg-white/[0.06]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide passphrase" : "Show passphrase"}
          className="absolute right-0.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-fg-2 hover:text-fg"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
      {showStrength ? (
        <div className="px-0.5 pt-1" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full bg-white/10 transition-colors"
                style={strength.score >= i ? { backgroundColor: COLORS[strength.score] } : undefined}
              />
            ))}
          </div>
          <p className={cn("mt-1.5 text-[12px]", strength.score >= 3 ? "text-income" : "text-fg-2")}>
            {value ? strength.label : "At least 10 characters. A short sentence works well."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
