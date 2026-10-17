"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCheck, Pencil, ShoppingBag } from "lucide-react";
import type { AssetType, WishItem } from "@/types";
import { useStore } from "@/lib/store";
import { affordability, progress, wishMonthlyNeeded } from "@/lib/calculations";
import { formatDate, todayISO, uid } from "@/lib/format";
import { ASSET_TYPES, MODULES } from "@/lib/modules";
import { COLORS } from "@/lib/colors";
import { itemVariants } from "@/lib/motion";
import { Money, Pct, useFormatMoney } from "@/components/ui/money";
import { AffordChip, Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Field, NumberInput, Select } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";

export function WishCard({ item, monthlyRemaining, onBuy }: { item: WishItem; monthlyRemaining: number; onBuy: (w: WishItem) => void }) {
  const { openEditor } = useStore();
  const fmt = useFormatMoney();
  const pct = progress(item.setAside, item.price);
  const needed = wishMonthlyNeeded(item);
  const status = affordability(item, monthlyRemaining);
  const left = Math.max(0, item.price - item.setAside);

  return (
    <motion.article variants={itemVariants} className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={ShoppingBag} color={MODULES.planning.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold">{item.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip color={item.priority === "need" ? COLORS.payable : COLORS.investments}>{item.priority === "need" ? "Need" : "Want"}</Chip>
            <AffordChip value={status} />
          </div>
        </div>
        <Money value={item.price} className="text-[17px] font-semibold" />
      </div>
      <ProgressBar className="mt-5" value={pct} color={COLORS.accent} label={`${item.name} saved`} />
      <div className="mt-2 flex items-center justify-between text-[13px] text-fg-2">
        <span>
          <Money value={item.setAside} className="text-[13px] text-fg" /> set aside
        </span>
        <Pct value={pct} />
      </div>
      <p className="mt-3 rounded-[12px] bg-white/[0.04] px-3 py-2.5 text-[13px] text-fg-2">
        {left === 0 ? (
          <span className="text-fg">You have the full amount set aside.</span>
        ) : item.targetDate && needed > 0 ? (
          <>
            Save <span className="num font-semibold text-fg">{fmt(Math.ceil(needed))}/month</span> to reach this by{" "}
            <span className="text-fg">{formatDate(item.targetDate, { month: "short", year: "numeric" })}</span>.
          </>
        ) : (
          <>
            <span className="num font-semibold text-fg">{fmt(left)}</span> to go. Add a target date to get a monthly plan.
          </>
        )}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="tinted" size="sm" className="h-11 flex-1" onClick={() => onBuy(item)}>
          <CheckCheck aria-hidden />
          Mark as bought
        </Button>
        <Button variant="secondary" size="sm" className="h-11" onClick={() => openEditor({ module: "planning", item: item as never })} aria-label={`Edit ${item.name}`}>
          <Pencil aria-hidden />
          Edit
        </Button>
      </div>
    </motion.article>
  );
}

export function BuySheet({ item, onClose }: { item: WishItem | null; onClose: () => void }) {
  const { patch, upsert, toast } = useStore();
  const [addAsset, setAddAsset] = useState(true);
  const [value, setValue] = useState<number | undefined>(undefined);
  const [type, setType] = useState<AssetType>("gadget");

  const confirm = () => {
    if (!item) return;
    patch("wishlist", item.id, { bought: true, boughtDate: todayISO(), setAside: item.price });
    if (addAsset) {
      upsert("assets", { id: uid(), name: item.name, type, value: value ?? item.price, dateAcquired: todayISO() });
    }
    toast(addAsset ? `${item.name} bought and added to Assets` : `${item.name} marked as bought`, "success");
    onClose();
  };

  return (
    <Sheet
      open={item !== null}
      onOpenChange={(o) => {
        if (!o) {
          setValue(undefined);
          onClose();
        }
      }}
      title="Mark as bought"
      description={item ? `Nice — you got the ${item.name.toLowerCase()}.` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} className="min-w-32">Confirm</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-white/[0.02] px-4 py-3">
          <div>
            <label htmlFor="buy-asset" className="text-[15px] font-medium">Add it to my assets</label>
            <p className="text-[13px] text-fg-2">Counts toward your net worth.</p>
          </div>
          <Switch id="buy-asset" label="Add to assets" checked={addAsset} onChange={setAddAsset} />
        </div>
        {addAsset && item ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Estimated value" htmlFor="buy-value">
              <NumberInput id="buy-value" min={0} value={value ?? item.price} onChange={setValue} />
            </Field>
            <Field label="Asset type" htmlFor="buy-type">
              <Select<AssetType>
                id="buy-type"
                value={type}
                onChange={setType}
                options={Object.entries(ASSET_TYPES).map(([v, m]) => ({ value: v as AssetType, label: m.label }))}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
