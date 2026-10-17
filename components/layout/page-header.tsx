"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { groupForPath } from "@/lib/nav";
import { itemVariants, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MonthPicker } from "@/components/layout/month-picker";
import { SyncStatusPill } from "@/components/layout/sync-status";
import { PrivacyToggle } from "@/components/security/privacy-toggle";
import { AppMark } from "@/components/security/secure-screen";

function MobileTopBar() {
  return (
    <div className="-mt-1 mb-4 flex items-center justify-between lg:hidden">
      <span className="flex items-center gap-2 text-[15px] font-semibold">
        <AppMark size={28} />
        Budget
      </span>
      <div className="flex items-center gap-2">
        <SyncStatusPill />
        <PrivacyToggle />
      </div>
    </div>
  );
}

export function SubNav() {
  const pathname = usePathname();
  const group = groupForPath(pathname);
  if (group.items.length < 2 || group.key === "more") return null;
  return (
    <nav aria-label={`${group.label} sections`} className="scrollbar-none -mx-4 mb-5 overflow-x-auto px-4 lg:hidden">
      <div className="inline-flex rounded-[11px] border border-border bg-white/[0.05] p-[3px]">
        {group.items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center whitespace-nowrap rounded-[8px] px-3.5 text-[14px] font-medium transition-colors",
                active ? "text-fg" : "text-fg-2",
              )}
            >
              {active ? (
                <motion.span layoutId="subnav-active" transition={spring} className="absolute inset-0 rounded-[8px] bg-white/[0.13]" />
              ) : null}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  showMonth = false,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  showMonth?: boolean;
}) {
  return (
    <motion.header variants={itemVariants} className="mb-6">
      <MobileTopBar />
      <SubNav />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[34px]">{title}</h1>
          <p className="mt-1 text-[15px] text-fg-2">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <SyncStatusPill />
            <PrivacyToggle />
          </div>
          {showMonth ? <MonthPicker /> : null}
          {actions}
        </div>
      </div>
    </motion.header>
  );
}
