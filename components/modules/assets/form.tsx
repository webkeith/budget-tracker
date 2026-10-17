"use client";

import { useEffect } from "react";
import type { Asset, AssetType } from "@/types";
import { uid } from "@/lib/format";
import { ASSET_TYPES, MODULES } from "@/lib/modules";
import { AmountInput } from "@/components/ui/amount-input";
import { Field, TextInput } from "@/components/ui/field";
import { ChoicePills, FORM_ID, useDraft, type FormProps } from "@/components/modules/shared/form-kit";

export function AssetForm({ item, preset, onSubmit, onValidChange }: FormProps<Asset>) {
  const [d, set] = useDraft<Asset>(
    item ?? {
      id: uid(),
      name: (preset?.name as string) ?? "",
      type: (preset?.type as AssetType) ?? "bank",
      value: (preset?.value as number) ?? 0,
      dateAcquired: (preset?.dateAcquired as string) ?? "",
    },
  );
  const valid = d.name.trim().length > 0 && d.value > 0;
  useEffect(() => onValidChange(valid), [valid, onValidChange]);
  return (
    <form id={FORM_ID} className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...d, name: d.name.trim() }); }}>
      <AmountInput id="asset-value" label="Estimated value" value={d.value || undefined} onChange={(v) => set("value", v ?? 0)} color={MODULES.assets.color} autoFocus={!item} />
      <Field label="Name" htmlFor="asset-name">
        <TextInput id="asset-name" placeholder="e.g. Savings account, Car" value={d.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Type">
        <ChoicePills
          label="Type"
          value={d.type}
          onChange={(v: AssetType) => set("type", v)}
          options={Object.entries(ASSET_TYPES).map(([value, m]) => ({ value: value as AssetType, label: m.label, color: MODULES.assets.color }))}
        />
      </Field>
      <Field label="Date acquired" htmlFor="asset-date">
        <TextInput id="asset-date" type="date" value={d.dateAcquired ?? ""} onChange={(e) => set("dateAcquired", e.target.value)} />
      </Field>
    </form>
  );
}
