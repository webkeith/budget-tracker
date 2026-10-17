"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { NAV_GROUPS, groupForPath } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TabBar() {
  const pathname = usePathname();
  const active = groupForPath(pathname).key;
  const { setQuickAddOpen } = useStore();
  const left = NAV_GROUPS.slice(0, 2);
  const right = NAV_GROUPS.slice(2);

  const renderTab = (g: (typeof NAV_GROUPS)[number]) => {
    const isActive = g.key === active;
    const Icon = g.icon;
    return (
      <Link
        key={g.key}
        href={g.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
          isActive ? "text-accent" : "text-fg-2",
        )}
      >
        <Icon aria-hidden className="size-6" strokeWidth={isActive ? 1.9 : 1.5} />
        {g.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-[var(--tabbar-height)] max-w-md items-center px-1">
        {left.map(renderTab)}
        <div className="flex w-[68px] shrink-0 justify-center">
          <motion.button
            type="button"
            aria-label="Add entry"
            onClick={() => setQuickAddOpen(true)}
            whileTap={{ scale: 0.92 }}
            className="-mt-7 inline-flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_24px_rgba(10,132,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-4 ring-bg"
          >
            <Plus className="size-7" strokeWidth={2} aria-hidden />
          </motion.button>
        </div>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}
