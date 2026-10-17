"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Ring({
  value,
  color,
  size = 72,
  stroke = 9,
  label,
  children,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(v * 100)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - v) : c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 25%, transparent))` }}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}

export function RingStack({
  rings,
  size = 132,
  stroke = 12,
  gap = 3,
}: {
  rings: { value: number; color: string; label: string }[];
  size?: number;
  stroke?: number;
  gap?: number;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {rings.map((ring, i) => {
        const s = size - i * (stroke + gap) * 2;
        return (
          <div key={ring.label} className="absolute" style={{ top: (size - s) / 2, left: (size - s) / 2 }}>
            <Ring value={ring.value} color={ring.color} size={s} stroke={stroke} label={ring.label} />
          </div>
        );
      })}
    </div>
  );
}
