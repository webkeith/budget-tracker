"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { buildInsights } from "@/lib/insights";
import { useFormatMoney } from "@/components/ui/money";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { CopyMonthButton } from "@/components/modules/shared/copy-month-button";
import { OverBudgetBanner } from "@/components/modules/shared/over-budget-banner";
import { PendingReminder } from "@/components/modules/clients/pending-reminder";
import {
  IncomeByClient,
  LoanPayoff,
  NetWorthHero,
  SavingsRings,
  SpendingDonut,
  SummaryRow,
  TrendPanel,
  UpcomingDues,
  WishlistProgress,
} from "@/components/modules/dashboard/widgets";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data, month, currentMonth } = useStore();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const fmt = useFormatMoney();
  const insights = buildInsights(data, month, month === currentMonth, new Date(), fmt);

  return (
    <Page>
      <PageHeader title={greeting()} description="Here's where your money stands." showMonth actions={<CopyMonthButton />} />
      <OverBudgetBanner />
      <PendingReminder className="mb-4" />
      <div className="space-y-4 md:space-y-5">
        <NetWorthHero insights={insights} />
        <SummaryRow period={period} onPeriod={setPeriod} />
        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
          <SpendingDonut className="lg:col-span-6" />
          <TrendPanel className="lg:col-span-6" period={period} />
          <UpcomingDues className="lg:col-span-6" />
          <IncomeByClient className="lg:col-span-6" />
          <SavingsRings className="lg:col-span-7" />
          <LoanPayoff className="lg:col-span-5" />
          <WishlistProgress className="lg:col-span-12" />
        </div>
      </div>
    </Page>
  );
}
