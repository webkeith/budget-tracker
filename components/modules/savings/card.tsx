"use client";

import { motion } from "framer-motion";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import type { SavingsFund } from "@/types";
import { useStore } from "@/lib/store";
import { averageMonthlyExpenses, monthsCovered, progress } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { COLORS } from "@/lib/colors";
import { itemVariants } from "@/lib/motion";
import { Money, Pct, useFormatMoney } from "@/components/ui/money";
import { Ring } from "@/components/charts/ring";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const PALETTE = [COLORS.income, COLORS.investments, COLORS.responsibilities, COLORS.accent, COLORS.assets];

function FundActions({ fund }: { fund: SavingsFund }) {
  const { patch, openEditor, toast } = useStore();
  const fmt = useFormatMoney();
  return (
    <div className="flex gap-2">
      {fund.monthlyContribution > 0 && fund.current < fund.target ? (
        <Button
          variant="tinted"
          size="sm"
          className="h-11 flex-1"
          onClick={() => {
            patch("savings", fund.id, { current: fund.current + fund.monthlyContribution });
            toast(`Added ${fmt(fund.monthlyContribution)} to ${fund.name}`, "success");
          }}
        >
          <Plus aria-hidden />
          Add {fmt(fund.monthlyContribution)}
        </Button>
      ) : null}
      <Button variant="secondary" size="sm" className="h-11" onClick={() => openEditor({ module: "savings", item: fund as never })} aria-label={`Edit ${fund.name}`}>
        <Pencil aria-hidden />
        Edit
      </Button>
    </div>
  );
}

function monthsToGoal(f: SavingsFund) {
  if (f.current >= f.target) return 0;
  if (f.monthlyContribution <= 0) return Infinity;
  return Math.ceil((f.target - f.current) / f.monthlyContribution);
}

export function EmergencyFundCard({ fund }: { fund: SavingsFund }) {
  const { data, month } = useStore();
  const avg = averageMonthlyExpenses(data, month);
  const covered = monthsCovered(fund.current, avg);
  const pct = progress(fund.current, fund.target);
  const toGo = monthsToGoal(fund);
  const color = MODULES.savings.color;
  return (
    <motion.section variants={itemVariants} aria-label="Emergency fund" className="card relative overflow-hidden p-5 md:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-[0.15] blur-3xl" style={{ background: color }} />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <Ring value={pct} color={color} size={156} stroke={16} label="Emergency fund progress">
          <div className="text-center">
            <Pct value={pct} className="block text-[30px] font-semibold leading-none" />
            <p className="mt-1 text-[12px] text-fg-2">of goal</p>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <Chip color={color} icon={ShieldCheck}>Emergency fund</Chip>
          <h2 className="mt-2 text-[20px] font-semibold">{fund.name}</h2>
          <p className="mt-1 text-[15px] text-fg-2">
            {avg > 0 ? (
              <>
                Covers about <span className="num font-semibold text-fg">{covered.toFixed(1)} months</span> of your usual expenses
                <span> (<Money value={Math.round(avg)} className="text-[15px]" />/month).</span>
              </>
            ) : (
              "Add your bills and spending to see how many months this covers."
            )}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt className="label">Saved</dt>
              <dd className="mt-0.5 text-[17px] font-semibold"><Money value={fund.current} animate /></dd>
            </div>
            <div>
              <dt className="label">Target</dt>
              <dd className="mt-0.5 text-[17px] font-semibold"><Money value={fund.target} /></dd>
            </div>
            <div>
              <dt className="label">Goal in</dt>
              <dd className="num mt-0.5 text-[17px] font-semibold">{toGo === 0 ? "Done" : toGo === Infinity ? "—" : `${toGo} mo`}</dd>
            </div>
          </dl>
          <div className="mt-5 max-w-sm">
            <FundActions fund={fund} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function FundCard({ fund, index }: { fund: SavingsFund; index: number }) {
  const pct = progress(fund.current, fund.target);
  const color = PALETTE[index % PALETTE.length];
  const toGo = monthsToGoal(fund);
  return (
    <motion.article variants={itemVariants} className="card flex flex-col p-5">
      <div className="flex items-center gap-4">
        <Ring value={pct} color={color} size={76} stroke={9} label={`${fund.name} progress`}>
          <Pct value={pct} className="text-[14px] font-semibold" />
        </Ring>
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold">{fund.name}</h3>
          <p className="mt-0.5 text-[14px]">
            <Money value={fund.current} className="font-semibold" /> <span className="text-fg-2">of</span> <Money value={fund.target} className="text-fg-2" />
          </p>
          <p className="mt-0.5 text-[13px] text-fg-2">
            {toGo === 0 ? "Goal reached" : toGo === Infinity ? "No monthly contribution yet" : (
              <>
                <Money value={fund.monthlyContribution} className="text-[13px]" />/mo · ~{toGo} mo to go
              </>
            )}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <FundActions fund={fund} />
      </div>
    </motion.article>
  );
}
