"use client";

import type { Asset, AssetType } from "@/types";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { ASSET_TYPES, MODULES } from "@/lib/modules";
import { Money } from "@/components/ui/money";
import { ListGroup, ListRow } from "@/components/modules/shared/list";

const ORDER: AssetType[] = ["cash", "bank", "property", "vehicle", "gadget", "other"];

export function AssetGroups({ items }: { items: Asset[] }) {
  const { openEditor } = useStore();
  return (
    <div className="space-y-4">
      {ORDER.map((type) => {
        const list = items.filter((a) => a.type === type).sort((a, b) => b.value - a.value);
        if (!list.length) return null;
        const total = list.reduce((s, a) => s + a.value, 0);
        return (
          <ListGroup key={type} title={ASSET_TYPES[type].label} total={<Money value={total} />}>
            {list.map((a) => (
              <ListRow
                key={a.id}
                icon={ASSET_TYPES[a.type].icon}
                color={MODULES.assets.color}
                title={a.name}
                subtitle={a.dateAcquired ? `Since ${formatDate(a.dateAcquired, { month: "short", year: "numeric" })}` : ASSET_TYPES[a.type].label}
                right={<Money value={a.value} className="text-[15px] font-semibold" />}
                onClick={() => openEditor({ module: "assets", item: a as never })}
              />
            ))}
          </ListGroup>
        );
      })}
    </div>
  );
}
