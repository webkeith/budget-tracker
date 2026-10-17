import { ArrowDownLeft, ArrowUpRight, Ellipsis, Gem, HandHeart, House, PiggyBank, Receipt, Settings, Target, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  key: "home" | "in" | "out" | "goals" | "more";
  label: string;
  icon: LucideIcon;
  href: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { key: "home", label: "Home", icon: House, href: "/", items: [{ href: "/", label: "Overview", icon: House }] },
  { key: "in", label: "Money In", icon: ArrowDownLeft, href: "/income", items: [{ href: "/income", label: "Income", icon: ArrowDownLeft }] },
  {
    key: "out",
    label: "Money Out",
    icon: ArrowUpRight,
    href: "/payables",
    items: [
      { href: "/payables", label: "Payables", icon: Receipt },
      { href: "/responsibilities", label: "Responsibilities", icon: HandHeart },
    ],
  },
  {
    key: "goals",
    label: "Goals",
    icon: Target,
    href: "/savings",
    items: [
      { href: "/savings", label: "Savings", icon: PiggyBank },
      { href: "/investments", label: "Investments", icon: TrendingUp },
      { href: "/planning", label: "Planning to Buy", icon: Target },
    ],
  },
  {
    key: "more",
    label: "More",
    icon: Ellipsis,
    href: "/more",
    items: [
      { href: "/assets", label: "Assets", icon: Gem },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function groupForPath(pathname: string): NavGroup {
  if (pathname === "/more") return NAV_GROUPS[4];
  return NAV_GROUPS.find((g) => g.key !== "home" && g.items.some((i) => pathname.startsWith(i.href))) ?? NAV_GROUPS[0];
}
