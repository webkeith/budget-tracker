"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { COLORS } from "@/lib/colors";
import { useMoney } from "@/lib/store";
import { usePrivacy, MASK } from "@/lib/privacy";
import { formatCompact, formatMoney } from "@/lib/format";

export interface TrendDatum {
  label: string;
  income: number;
  outgoing: number;
}

export function AreaTrend({ data, height = 200 }: { data: TrendDatum[]; height?: number }) {
  const reduce = useReducedMotion();
  const { currency, locale } = useMoney();
  const { hidden } = usePrivacy();
  const show = (v: number) => (hidden ? `${formatMoney(0, currency, locale).replace(/[\d.,]+/, "")}${MASK}` : formatMoney(v, currency, locale));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.income} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COLORS.income} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fill-outgoing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.payable} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COLORS.payable} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
            dy={6}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[(min: number) => Math.max(0, min * 0.82), (max: number) => max * 1.06]} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="glass rounded-[12px] border border-border px-3 py-2 text-[12px] shadow-float">
                  <p className="mb-1 font-medium text-fg">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} className="num flex items-center gap-2 text-fg-2">
                      <span className="size-2 rounded-full" style={{ background: p.dataKey === "income" ? COLORS.income : COLORS.payable }} />
                      {p.dataKey === "income" ? "Income" : "Outgoing"}
                      <span className="ml-auto pl-3 text-fg">{show(Number(p.value))}</span>
                    </p>
                  ))}
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke={COLORS.income}
            strokeWidth={2}
            fill="url(#fill-income)"
            isAnimationActive={!reduce}
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="outgoing"
            stroke={COLORS.payable}
            strokeWidth={2}
            fill="url(#fill-outgoing)"
            isAnimationActive={!reduce}
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">
        {hidden ? "Amounts hidden" : data.map((d) => `${d.label}: income ${formatCompact(d.income, currency, locale)}, outgoing ${formatCompact(d.outgoing, currency, locale)}`).join("; ")}
      </span>
    </div>
  );
}
