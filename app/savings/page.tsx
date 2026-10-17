"use client";

import { useStore } from "@/lib/store";
import { progress, totalSavings, totalSavingsContributions } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, Pct, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { AddButton } from "@/components/modules/shared/add-button";
import { StatTile } from "@/components/modules/shared/list";
import { EmergencyFundCard, FundCard } from "@/components/modules/savings/card";

export default function SavingsPage() {
  const { data, openEditor } = useStore();
  const fmt = useFormatMoney();
  const meta = MODULES.savings;
  const ef = data.savings.find((s) => s.isEmergency);
  const others = data.savings.filter((s) => s !== ef);
  const targets = data.savings.reduce((a, s) => a + s.target, 0);
  const saved = totalSavings(data);

  return (
    <Page>
      <PageHeader title={meta.title} description={meta.description} actions={<AddButton module="savings" label="Add fund" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label="Total saved" className="col-span-2 md:col-span-1">
          <Money value={saved} animate />
        </StatTile>
        <StatTile label="Monthly contributions">
          <Money value={totalSavingsContributions(data.savings)} />
        </StatTile>
        <StatTile label="Overall progress">
          <Pct value={progress(saved, targets)} />
        </StatTile>
      </div>
      {data.savings.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title="No savings funds yet"
            example={`Emergency fund · target ${fmt(150000)}`}
            cta="Add a fund"
            onAction={() => openEditor({ module: "savings" })}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {ef ? <EmergencyFundCard fund={ef} /> : (
            <button
              type="button"
              onClick={() => openEditor({ module: "savings", item: undefined, preset: {} })}
              className="card w-full p-5 text-left text-[14px] text-fg-2 hover:border-border-strong"
            >
              <span className="font-medium text-fg">No emergency fund yet.</span> Mark a fund as your emergency fund to see how many months it covers.
            </button>
          )}
          {others.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {others.map((f, i) => (
                <FundCard key={f.id} fund={f} index={i} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </Page>
  );
}
