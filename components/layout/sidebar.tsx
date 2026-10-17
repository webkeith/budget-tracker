"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Wallet } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/auth/account-card";

export function Sidebar() {
  const pathname = usePathname();
  const { setQuickAddOpen, sampleMode } = useStore();
  return (
    <aside
      aria-label="Main navigation"
      className="glass fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border lg:flex"
    >
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="inline-flex size-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-accent to-investments shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <Wallet className="size-[18px] text-white" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Budget</p>
          <p className="text-[12px] text-fg-2">Personal finances</p>
        </div>
      </div>
      <div className="px-3">
        <Button className="w-full" onClick={() => setQuickAddOpen(true)} aria-keyshortcuts="n">
          <Plus aria-hidden />
          Add entry
        </Button>
      </div>
      <nav className="scrollbar-none mt-4 flex-1 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="mt-3 first:mt-0">
            {group.key !== "home" ? <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-fg-2">{group.label}</p> : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors",
                        active ? "text-fg" : "text-fg-2 hover:bg-white/[0.04] hover:text-fg",
                      )}
                    >
                      {active ? (
                        <motion.span layoutId="sidebar-active" transition={spring} className="absolute inset-0 rounded-[10px] bg-white/[0.08]" />
                      ) : null}
                      <Icon aria-hidden className={cn("relative size-[18px]", active && "text-accent")} strokeWidth={1.5} />
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {sampleMode ? (
        <Link href="/settings" className="mx-3 mb-4 rounded-[12px] border border-border bg-white/[0.03] px-3 py-2.5 text-[12px] text-fg-2 hover:border-border-strong">
          <span className="font-medium text-due">Sample data on.</span> Nothing is saved or synced. Turn it off in Settings.
        </Link>
      ) : null}
      <AccountCard />
    </aside>
  );
}
