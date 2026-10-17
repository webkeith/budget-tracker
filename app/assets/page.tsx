"use client";

import { useStore } from "@/lib/store";
import { netWorth, totalAssets } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { AddButton } from "@/components/modules/shared/add-button";
import { StatTile } from "@/components/modules/shared/list";
import { AssetGroups } from "@/components/modules/assets/list";

export default function AssetsPage() {
  const { data, month, openEditor } = useStore();
  const fmt = useFormatMoney();
  const meta = MODULES.assets;
  const total = totalAssets(data);
  const liquid = data.assets.filter((a) => a.type === "cash" || a.type === "bank").reduce((s, a) => s + a.value, 0);

  return (
    <Page>
      <PageHeader title={meta.title} description={meta.description} actions={<AddButton module="assets" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label="Total assets" className="col-span-2 md:col-span-1">
          <Money value={total} animate />
        </StatTile>
        <StatTile label="Cash & bank" hint="Money you can use right away">
          <Money value={liquid} />
        </StatTile>
        <StatTile label="Net worth" hint="Assets + savings + investments − loans">
          <Money value={netWorth(data, month)} />
        </StatTile>
      </div>
      {data.assets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title="No assets yet"
            example={`Savings account · ${fmt(45000)}`}
            cta="Add an asset"
            onAction={() => openEditor({ module: "assets" })}
          />
        </div>
      ) : (
        <AssetGroups items={data.assets} />
      )}
    </Page>
  );
}
