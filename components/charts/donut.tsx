"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useReducedMotion } from "framer-motion";
import { Money } from "@/components/ui/money";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({ data, total, caption }: { data: DonutSlice[]; total: number; caption: string }) {
  const reduce = useReducedMotion();
  const slices = data.filter((d) => d.value > 0);
  const empty = slices.length === 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={empty ? [{ key: "empty", label: "", value: 1, color: "rgba(255,255,255,0.08)" }] : slices}
            dataKey="value"
            nameKey="label"
            innerRadius="74%"
            outerRadius="100%"
            paddingAngle={empty ? 0 : 2.5}
            cornerRadius={10}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={!reduce}
            animationDuration={900}
          >
            {(empty ? [{ key: "empty", color: "rgba(255,255,255,0.08)" }] : slices).map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="label">{caption}</span>
        <Money value={total} animate className="mt-0.5 text-[24px] font-semibold" />
      </div>
    </div>
  );
}
