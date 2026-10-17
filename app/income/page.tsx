"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, UsersRound } from "lucide-react";
import type { Client, Payout } from "@/types";
import { useStore } from "@/lib/store";
import { expectedIncome, incomeMonthlyAmount, receivedIncome, standaloneIncomes, totalIncome } from "@/lib/calculations";
import { allPayoutsForMonth } from "@/lib/clients";
import { addMonths, monthLabel } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { itemVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { Money, useFormatMoney } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { AddButton } from "@/components/modules/shared/add-button";
import { CopyMonthButton } from "@/components/modules/shared/copy-month-button";
import { StatTile } from "@/components/modules/shared/list";
import { IncomeList } from "@/components/modules/income/list";
import { ClientCard } from "@/components/modules/clients/card";
import { ClientAvatar, PayoutRow } from "@/components/modules/clients/parts";
import { PendingReminder } from "@/components/modules/clients/pending-reminder";

type Tab = "month" | "clients";

function ClientPayoutGroup({ client, payouts }: { client: Client; payouts: Payout[] }) {
  const { openClientSheet } = useStore();
  const total = payouts.reduce((a, p) => a + (p.status === "received" || p.status === "expected" ? p.amount : 0), 0);
  return (
    <motion.section variants={itemVariants} className="card p-2">
      <button
        type="button"
        onClick={() => openClientSheet({ kind: "detail", clientId: client.id })}
        className="flex w-full items-center gap-3 rounded-[14px] px-3 pb-2 pt-3 text-left hover:bg-white/[0.03]"
      >
        <ClientAvatar client={client} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{client.name}</span>
          <span className="block text-[12px] text-fg-2">
            {client.payType === "fixed" ? "Fixed" : "Hourly"} · {payouts.length} payday{payouts.length === 1 ? "" : "s"}
          </span>
        </span>
        <Money value={total} className="text-[14px] font-medium" />
      </button>
      <ul className="divide-y divide-white/[0.05]">
        {payouts.map((p) => (
          <PayoutRow key={p.id} payout={p} client={client} />
        ))}
      </ul>
    </motion.section>
  );
}

function MonthView() {
  const { data, month, openEditor } = useStore();
  const fmt = useFormatMoney();
  const payouts = allPayoutsForMonth(data, month);
  const standalone = standaloneIncomes(data, month).sort((a, b) => incomeMonthlyAmount(b) - incomeMonthlyAmount(a));
  const groups = data.clients
    .map((c) => ({ client: c, payouts: payouts.filter((p) => p.clientId === c.id) }))
    .filter((g) => g.payouts.length);
  const total = totalIncome(data, month);
  const received = receivedIncome(data, month);
  const expected = expectedIncome(data, month);
  const last = totalIncome(data, addMonths(month, -1));

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-3 md:gap-4">
        <StatTile
          label={`Total for ${monthLabel(month, "short")}`}
          className="col-span-2 md:col-span-1"
          hint={last ? <>{total >= last ? "Up" : "Down"} from <Money value={last} className="text-[13px]" /> last month</> : undefined}
        >
          <Money value={total} animate tone={total > 0 ? "income" : undefined} />
        </StatTile>
        <StatTile label="Received" hint="Already in your account">
          <Money value={received} />
        </StatTile>
        <StatTile label="Expected" hint="Fixed client paydays not received yet">
          <Money value={expected} />
        </StatTile>
      </div>
      <PendingReminder className="mb-4" />
      {groups.length === 0 && standalone.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MODULES.income.icon}
            color={MODULES.income.color}
            title={`No income for ${monthLabel(month, "short")} yet`}
            example={`Salary · ${fmt(42500)} · twice a month`}
            cta="Add income"
            onAction={() => openEditor({ module: "income" })}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <ClientPayoutGroup key={g.client.id} client={g.client} payouts={g.payouts} />
          ))}
          {standalone.length ? <IncomeList items={standalone} title="Other income" /> : null}
        </div>
      )}
    </>
  );
}

function ClientsView() {
  const { data, openEditor } = useStore();
  const fmt = useFormatMoney();
  const [showPast, setShowPast] = useState(false);
  const current = data.clients.filter((c) => c.status !== "terminated").sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "active" ? -1 : 1));
  const past = data.clients.filter((c) => c.status === "terminated");

  if (!data.clients.length) {
    return (
      <div className="card">
        <EmptyState
          icon={UsersRound}
          color={MODULES.clients.color}
          title="No clients yet"
          example={`Acme Studio · ${fmt(25000)} · twice a month, or Northwind (hourly) · logs weekly`}
          cta="Add a client"
          onAction={() => openEditor({ module: "clients" })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {current.length ? (
        <motion.ul variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {current.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </motion.ul>
      ) : (
        <p className="text-[14px] text-fg-2">No active clients right now.</p>
      )}
      {past.length ? (
        <section>
          <button
            type="button"
            aria-expanded={showPast}
            onClick={() => setShowPast((v) => !v)}
            className="flex min-h-11 items-center gap-2 rounded-full px-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-2 hover:text-fg"
          >
            Past clients ({past.length})
            <ChevronDown className={cn("size-4 transition-transform", showPast && "rotate-180")} aria-hidden />
          </button>
          <AnimatePresence initial={false}>
            {showPast ? (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 grid grid-cols-1 gap-4 overflow-hidden md:grid-cols-2 xl:grid-cols-3"
              >
                {past.map((c) => (
                  <ClientCard key={c.id} client={c} />
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </section>
      ) : null}
    </div>
  );
}

function IncomeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, month } = useStore();
  const tab: Tab = params.get("tab") === "clients" ? "clients" : "month";
  const meta = MODULES.income;
  const hasStandalone = standaloneIncomes(data, month).length > 0;

  return (
    <Page>
      <PageHeader
        title={meta.title}
        description={tab === "clients" ? MODULES.clients.description : meta.description}
        showMonth={tab === "month"}
        actions={
          tab === "month" ? (
            <>
              {hasStandalone ? <CopyMonthButton /> : null}
              <AddButton module="income" />
            </>
          ) : (
            <AddButton module="clients" label="Add client" />
          )
        }
      />
      <motion.div variants={itemVariants} className="mb-5">
        <Segmented<Tab>
          ariaLabel="Income view"
          value={tab}
          onChange={(t) => router.replace(t === "clients" ? `${pathname}?tab=clients` : pathname, { scroll: false })}
          options={[
            { value: "month", label: "This month" },
            { value: "clients", label: `Clients${data.clients.length ? ` · ${data.clients.filter((c) => c.status !== "terminated").length}` : ""}` },
          ]}
        />
      </motion.div>
      {tab === "month" ? <MonthView /> : <ClientsView />}
    </Page>
  );
}

export default function IncomePage() {
  return (
    <Suspense>
      <IncomeInner />
    </Suspense>
  );
}

