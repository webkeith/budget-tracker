"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Delete, Fingerprint, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const LETTERS: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ" };

export function PinKeypad({
  length,
  onComplete,
  disabled,
  onBiometric,
  label,
}: {
  length: number;
  onComplete: (pin: string) => Promise<boolean>;
  disabled?: boolean;
  onBiometric?: () => void;
  label: string;
}) {
  const [value, setValueState] = useState("");
  const valueRef = useRef("");
  const setValue = useCallback((v: string) => {
    valueRef.current = v;
    setValueState(v);
  }, []);
  const [busy, setBusy] = useState(false);
  const controls = useAnimationControls();

  const submit = useCallback(
    async (pin: string) => {
      setBusy(true);
      const ok = await onComplete(pin);
      setBusy(false);
      if (!ok) {
        await controls.start({ x: [0, -14, 12, -9, 6, -3, 0], transition: { duration: 0.45 } });
        setValue("");
      }
    },
    [onComplete, controls, setValue],
  );

  const press = useCallback(
    (d: string) => {
      if (busy || disabled) return;
      const v = valueRef.current;
      if (v.length >= length) return;
      const next = v + d;
      setValue(next);
      if (next.length === length) void submit(next);
    },
    [busy, disabled, length, submit, setValue],
  );

  const back = useCallback(() => {
    if (busy || disabled) return;
    setValue(valueRef.current.slice(0, -1));
  }, [busy, disabled, setValue]);

  useEffect(() => {
    setValue("");
  }, [length, setValue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  return (
    <div className="flex flex-col items-center">
      <motion.div animate={controls} className="flex h-6 items-center gap-4" role="status" aria-label={`${label}: ${value.length} of ${length} digits entered`}>
        {busy ? (
          <Loader2 className="size-5 animate-spin text-fg-2" aria-hidden />
        ) : (
          Array.from({ length }, (_, i) => (
            <motion.span
              key={i}
              animate={{ scale: i < value.length ? 1 : 0.85 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={cn("size-3.5 rounded-full border-[1.5px] transition-colors", i < value.length ? "border-fg bg-fg" : "border-white/40")}
            />
          ))
        )}
      </motion.div>
      <div className="mt-10 grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map((k) => (
          <Key key={k} onPress={() => press(k)} disabled={busy || disabled} label={k}>
            <span className="text-[30px] font-normal leading-none">{k}</span>
            <span className="mt-0.5 h-3 text-[9px] font-semibold tracking-[0.18em] text-fg-2">{LETTERS[k] ?? ""}</span>
          </Key>
        ))}
        {onBiometric ? (
          <button
            type="button"
            onClick={onBiometric}
            aria-label="Unlock with biometrics"
            className="inline-flex size-[76px] items-center justify-center rounded-full text-accent transition-colors hover:bg-white/[0.06]"
          >
            <Fingerprint className="size-8" strokeWidth={1.5} />
          </button>
        ) : (
          <span />
        )}
        <Key onPress={() => press("0")} disabled={busy || disabled} label="0">
          <span className="text-[30px] font-normal leading-none">0</span>
        </Key>
        <button
          type="button"
          onClick={back}
          aria-label="Delete last digit"
          disabled={!value.length || busy}
          className="inline-flex size-[76px] items-center justify-center rounded-full text-fg-2 transition-opacity hover:text-fg disabled:opacity-0"
        >
          <Delete className="size-7" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function Key({ children, onPress, disabled, label }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92, backgroundColor: "rgba(255,255,255,0.28)" }}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className="flex size-[76px] flex-col items-center justify-center rounded-full bg-white/[0.1] text-fg backdrop-blur transition-colors hover:bg-white/[0.14] disabled:opacity-50"
    >
      {children}
    </motion.button>
  );
}
