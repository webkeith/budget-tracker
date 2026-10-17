"use client";

import { useStore } from "@/lib/store";
import { totalInvestmentContributions, totalInvestmentValue } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { AddButton } from "@/components/modules/shared/add-button";
import { StatTile } from "@/components/modules/shared/list";
import { Allocation, GainLabel, InvestmentList } from "@/components/modules/investments/list";

export default function InvestmentsPage() {
  const { data, openEditor } = useStore();
  const fmt = useFormatMoney();
  const meta = MODULES.investments;
  const items = [...data.investments].sort((a, b) => b.currentValue - a.currentValue);
  const value = totalInvestmentValue(data);
  const invested = items.reduce((a, i) => a + i.invested, 0);

  return (
    <Page>
      <PageHeader title={meta.title} description={meta.description} actions={<AddButton module="investments" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label="Current value" className="col-span-2 md:col-span-1" hint={invested ? <GainLabel invested={invested} currentValue={value} size={13} /> : undefined}>
          <Money value={value} animate />
        </StatTile>
        <StatTile label="Total put in">
          <Money value={invested} />
        </StatTile>
        <StatTile label="Monthly contributions">
          <Money value={totalInvestmentContributions(data.investments)} />
        </StatTile>
      </div>
      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title="No investments yet"
            example={`Pag-IBIG MP2 · ${fmt(2000)}/month`}
            cta="Add an investment"
            onAction={() => openEditor({ module: "investments" })}
          />
        </div>
      ) : (
        <>
          <Allocation items={items} />
          <InvestmentList items={items} />
        </>
      )}
    </Page>
  );
}
