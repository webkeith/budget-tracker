"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { netWorth, totalAssets } from "@/lib/calculations";
import { MODULES } from "@/lib/modules";
import { itemVariants } from "@/lib/motion";
import { Page } from "@/components/layout/page";
import { PageHeader } from "@/components/layout/page-header";
import { IconTile } from "@/components/ui/icon-tile";
import { Money } from "@/components/ui/money";

export default function MorePage() {
  const { data, month } = useStore();
  const links = [
    { href: "/assets", label: "Assets", sub: <>Worth <Money value={totalAssets(data)} className="text-[13px]" /></>, icon: MODULES.assets.icon, color: MODULES.assets.color },
    { href: "/settings", label: "Settings", sub: "Currency, backups, sample data", icon: Settings, color: "#A1A1A6" },
  ];
  return (
    <Page className="max-w-3xl">
      <PageHeader title="More" description="Everything else in one place." />
      <motion.div variants={itemVariants} className="card mb-4 p-5">
        <p className="label">Net worth</p>
        <Money value={netWorth(data, month)} animate className="mt-1 block text-[34px] font-semibold" />
      </motion.div>
      <motion.ul variants={itemVariants} className="card divide-y divide-white/[0.05] p-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex min-h-[64px] items-center gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-white/[0.04]">
              <IconTile icon={l.icon} color={l.color} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{l.label}</span>
                <span className="block text-[13px] text-fg-2">{l.sub}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 text-fg-3" />
            </Link>
          </li>
        ))}
      </motion.ul>
    </Page>
  );
}
