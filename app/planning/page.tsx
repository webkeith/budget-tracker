"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";
import type { WishItem } from "@/types";
import { useStore } from "@/lib/store";
import { remainingBalance, wishMonthlyNeeded } from "@/lib/calculations";
import { formatDate } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { itemVariants } from "@/lib/motion";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { AddButton } from "@/components/modules/shared/add-button";
import { StatTile } from "@/components/modules/shared/list";
import { BuySheet, WishCard } from "@/components/modules/planning/card";

export default function PlanningPage() {
  const { data, month, openEditor, patch } = useStore();
  const fmt = useFormatMoney();
  const [buying, setBuying] = useState<WishItem | null>(null);
  const meta = MODULES.planning;
  const left = remainingBalance(data, month);
  const active = data.wishlist
    .filter((w) => !w.bought)
    .sort((a, b) => (a.priority === b.priority ? (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") : a.priority === "need" ? -1 : 1));
  const bought = data.wishlist.filter((w) => w.bought);
  const totalPrice = active.reduce((a, w) => a + w.price, 0);
  const totalAside = active.reduce((a, w) => a + w.setAside, 0);
  const monthlyNeeded = active.reduce((a, w) => a + (w.targetDate ? wishMonthlyNeeded(w) : 0), 0);

  return (
    <Page>
      <PageHeader title={meta.title} description={meta.description} actions={<AddButton module="planning" label="Add item" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label="Total wishlist" className="col-span-2 md:col-span-1" hint={<><Money value={totalAside} className="text-[13px]" /> set aside so far</>}>
          <Money value={totalPrice} animate />
        </StatTile>
        <StatTile label="Needed per month" hint="To hit every target date">
          <Money value={Math.ceil(monthlyNeeded)} />
        </StatTile>
        <StatTile label="Left this month" hint={left >= monthlyNeeded ? "Enough to stay on track" : "Not quite enough for all goals"}>
          <Money value={left} tone={left < 0 ? "payable" : undefined} />
        </StatTile>
      </div>
      {active.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title="Nothing on your list yet"
            example={`New laptop · ${fmt(65000)} · by June`}
            cta="Add an item"
            onAction={() => openEditor({ module: "planning" })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((w) => (
            <WishCard key={w.id} item={w} monthlyRemaining={left} onBuy={setBuying} />
          ))}
        </div>
      )}
      {bought.length ? (
        <motion.section variants={itemVariants} className="card mt-5 p-2">
          <h2 className="px-3 pb-1 pt-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-2">Bought</h2>
          <ul className="divide-y divide-white/[0.05]">
            {bought.map((w) => (
              <li key={w.id} className="flex min-h-[56px] items-center gap-3 px-3 py-2">
                <CheckCircle2 aria-hidden className="size-5 text-income" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{w.name}</span>
                  <span className="block text-[12px] text-fg-2">{w.boughtDate ? `Bought ${formatDate(w.boughtDate)}` : "Bought"}</span>
                </span>
                <Money value={w.price} className="text-[14px] font-medium" />
                <button
                  type="button"
                  aria-label={`Move ${w.name} back to the wishlist`}
                  onClick={() => patch("wishlist", w.id, { bought: false, boughtDate: undefined })}
                  className="inline-flex size-11 items-center justify-center rounded-full text-fg-2 hover:bg-white/[0.06] hover:text-fg"
                >
                  <RotateCcw className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      ) : null}
      <BuySheet item={buying} onClose={() => setBuying(null)} />
    </Page>
  );
}
