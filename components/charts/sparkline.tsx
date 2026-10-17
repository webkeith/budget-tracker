"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";

export function Sparkline({
  data,
  color = "#0A84FF",
  height = 64,
  id = "spark",
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
  id?: string;
}) {
  const reduce = useReducedMotion();
  if (data.length < 2) return <div style={{ height }} />;
  return (
    <div style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id}-fill)`}
            isAnimationActive={!reduce}
            animationDuration={1100}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
