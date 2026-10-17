"use client";

import { useStore } from "@/lib/store";
import { byMonth, responsibilityMonthlyAmount, totalIncome, totalResponsibilities } from "@/lib/calculations";
import { monthLabel } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, Pct, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { AddButton } from "@/components/modules/shared/add-button";
import { CopyMonthButton } from "@/components/modules/shared/copy-month-button";
import { StatTile } from "@/components/modules/shared/list";
import { ResponsibilityList } from "@/components/modules/responsibilities/list";

export default function ResponsibilitiesPage() {
  const { data, month, openEditor } = useStore();
  const fmt = useFormatMoney();
  const items = byMonth(data.responsibilities, month).sort((a, b) => responsibilityMonthlyAmount(b) - responsibilityMonthlyAmount(a));
  const total = totalResponsibilities(data, month);
  const income = totalIncome(data, month);
  const people = new Set(items.map((r) => r.recipient.trim().toLowerCase()).filter(Boolean)).size;
  const meta = MODULES.responsibilities;

  return (
    <Page>
      <PageHeader
        title={meta.title}
        description={meta.description}
        showMonth
        actions={
          <>
            {items.length ? <CopyMonthButton /> : null}
            <AddButton module="responsibilities" />
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile label={`Support in ${monthLabel(month, "short")}`} className="col-span-2 md:col-span-1" hint="Non-monthly items are spread out evenly.">
          <Money value={total} animate />
        </StatTile>
        <StatTile label="People & commitments">
          <span className="num">{people || items.length}</span>
        </StatTile>
        <StatTile label="Share of income" hint={income ? "Of what you earned this month" : "Add income to see this"}>
          <Pct value={income ? total / income : 0} />
        </StatTile>
      </div>
      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={meta.icon}
            color={meta.color}
            title="No responsibilities yet"
            example={`Allowance for Mama · ${fmt(8000)} monthly`}
            cta="Add a responsibility"
            onAction={() => openEditor({ module: "responsibilities" })}
          />
        </div>
      ) : (
        <ResponsibilityList items={items} />
      )}
    </Page>
  );
}
