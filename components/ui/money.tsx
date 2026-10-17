"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useMoney } from "@/lib/store";
import { MASK, usePrivacy } from "@/lib/privacy";
import { currencySymbol, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useCountUp(target: number, enabled = true) {
  const reduce = useReducedMotion();
  const { hidden } = usePrivacy();
  const active = enabled && !reduce && !hidden;
  const [value, setValue] = useState(active ? 0 : target);
  const from = useRef(active ? 0 : target);
  useEffect(() => {
    if (!active) {
      setValue(target);
      from.current = target;
      return;
    }
    const controls = animate(from.current, target, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    from.current = target;
    return () => controls.stop();
  }, [target, active]);
  return value;
}

function usePeek(enabled: boolean) {
  const [peeking, setPeeking] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) setPeeking(false);
  }, [enabled]);

  const cancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handlers = enabled
    ? {
        onPointerDown: () => {
          longPressed.current = false;
          cancel();
          pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            setPeeking(true);
            if (revealTimer.current) clearTimeout(revealTimer.current);
            revealTimer.current = setTimeout(() => setPeeking(false), 3000);
          }, 450);
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        onClickCapture: (e: React.MouseEvent) => {
          if (longPressed.current) {
            e.preventDefault();
            e.stopPropagation();
            longPressed.current = false;
          }
        },
      }
    : {};

  return { peeking, handlers };
}

export function Money({
  value,
  className,
  symbolClassName,
  animate: shouldAnimate = false,
  signed = false,
  tone,
}: {
  value: number;
  className?: string;
  symbolClassName?: string;
  animate?: boolean;
  signed?: boolean;
  tone?: "income" | "payable" | "auto";
}) {
  const { currency, locale } = useMoney();
  const { hidden } = usePrivacy();
  const { peeking, handlers } = usePeek(hidden);
  const masked = hidden && !peeking;
  const display = useCountUp(value, shouldAnimate);
  const rounded = shouldAnimate ? Math.round(display) : display;
  const negative = value < 0;
  const sign = masked ? "" : negative ? "−" : signed && value > 0 ? "+" : "";
  const toneClass = masked
    ? ""
    : tone === "income"
      ? "text-income"
      : tone === "payable"
        ? "text-payable"
        : tone === "auto"
          ? negative
            ? "text-payable"
            : value > 0
              ? "text-income"
              : ""
          : "";
  return (
    <span
      className={cn("num whitespace-nowrap", hidden && "cursor-default select-none touch-manipulation", toneClass, className)}
      aria-label={masked ? "Hidden amount. Press and hold to peek." : undefined}
      title={masked ? "Press and hold to peek" : undefined}
      {...handlers}
    >
      {sign}
      <span aria-hidden={masked || undefined} className={cn("mr-[0.06em] align-baseline text-[0.6em] font-medium", !tone && "text-fg-2", symbolClassName)}>
        {currencySymbol(currency, locale)}
      </span>
      {masked ? <span aria-hidden className="tracking-[0.04em] opacity-80">{MASK}</span> : formatNumber(Math.abs(rounded), locale)}
    </span>
  );
}

export function Pct({ value, digits = 0, className, absolute = false }: { value: number; digits?: number; className?: string; absolute?: boolean }) {
  const { hidePercent } = usePrivacy();
  const v = absolute ? Math.abs(value) : value;
  return (
    <span className={cn("num", className)} aria-label={hidePercent ? "Hidden percentage" : undefined}>
      {hidePercent ? "••%" : `${(v * 100).toFixed(digits)}%`}
    </span>
  );
}

export function useFormatMoney() {
  const { currency, locale } = useMoney();
  const { hidden } = usePrivacy();
  return (v: number) => {
    if (hidden) return `${currencySymbol(currency, locale)}${MASK}`;
    const sign = v < 0 ? "−" : "";
    return `${sign}${currencySymbol(currency, locale)}${formatNumber(Math.abs(v), locale)}`;
  };
}
