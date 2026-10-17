import {
  ArrowDownLeft,
  Banknote,
  Briefcase,
  Building2,
  Car,
  CircleDollarSign,
  CreditCard,
  Gem,
  HandHeart,
  Home,
  Laptop,
  Landmark,
  LineChart,
  PiggyBank,
  Receipt,
  Repeat,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Wallet,
  Zap,
  Bitcoin,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { COLORS } from "@/lib/colors";
import type {
  AssetType,
  IncomeSourceType,
  InvestmentType,
  ModuleKey,
  PayableCategory,
} from "@/types";

export interface ModuleMeta {
  key: ModuleKey;
  title: string;
  singular: string;
  description: string;
  href: string;
  color: string;
  icon: LucideIcon;
}

export const MODULES: Record<ModuleKey, ModuleMeta> = {
  clients: {
    key: "clients",
    title: "Clients",
    singular: "Client",
    description: "People and companies who pay you.",
    href: "/income?tab=clients",
    color: COLORS.income,
    icon: UsersRound,
  },
  income: {
    key: "income",
    title: "Income",
    singular: "Income",
    description: "Money that comes in each month.",
    href: "/income",
    color: COLORS.income,
    icon: ArrowDownLeft,
  },
  payables: {
    key: "payables",
    title: "Payables",
    singular: "Payable",
    description: "Bills and loans you pay regularly.",
    href: "/payables",
    color: COLORS.payable,
    icon: Receipt,
  },
  responsibilities: {
    key: "responsibilities",
    title: "Responsibilities",
    singular: "Responsibility",
    description: "People and commitments you support.",
    href: "/responsibilities",
    color: COLORS.responsibilities,
    icon: HandHeart,
  },
  expenses: {
    key: "expenses",
    title: "Other spending",
    singular: "Expense",
    description: "Groceries, transport, and everyday spending.",
    href: "/payables#other-spending",
    color: COLORS.expenses,
    icon: ShoppingBag,
  },
  savings: {
    key: "savings",
    title: "Savings",
    singular: "Savings fund",
    description: "Money you're keeping safe for later.",
    href: "/savings",
    color: COLORS.savings,
    icon: PiggyBank,
  },
  investments: {
    key: "investments",
    title: "Investments",
    singular: "Investment",
    description: "Money you've put to work so it can grow.",
    href: "/investments",
    color: COLORS.investments,
    icon: TrendingUp,
  },
  planning: {
    key: "planning",
    title: "Planning to Buy",
    singular: "Wishlist item",
    description: "Things you're saving up for.",
    href: "/planning",
    color: COLORS.accent,
    icon: Target,
  },
  assets: {
    key: "assets",
    title: "Assets",
    singular: "Asset",
    description: "Things you own that hold value.",
    href: "/assets",
    color: COLORS.assets,
    icon: Gem,
  },
};

export const INCOME_TYPES: Record<IncomeSourceType, { label: string; icon: LucideIcon }> = {
  salary: { label: "Salary", icon: Briefcase },
  freelance: { label: "Freelance", icon: Laptop },
  business: { label: "Side business", icon: Store },
  other: { label: "Other", icon: CircleDollarSign },
};

export const PAYABLE_CATEGORIES: Record<PayableCategory, { label: string; plural: string; icon: LucideIcon }> = {
  loan: { label: "Loan", plural: "Loans", icon: Landmark },
  insurance: { label: "Insurance", plural: "Insurance", icon: Shield },
  bill: { label: "Bill", plural: "Bills & utilities", icon: Zap },
  subscription: { label: "Subscription", plural: "Subscriptions", icon: Repeat },
};

export const INVESTMENT_TYPES: Record<InvestmentType, { label: string; icon: LucideIcon }> = {
  stocks: { label: "Stocks", icon: LineChart },
  "mutual-fund": { label: "Mutual fund / UITF", icon: TrendingUp },
  crypto: { label: "Crypto", icon: Bitcoin },
  mp2: { label: "Pag-IBIG MP2", icon: Building2 },
  "time-deposit": { label: "Time deposit", icon: Landmark },
  business: { label: "Business", icon: Store },
  other: { label: "Other", icon: Sparkles },
};

export const ASSET_TYPES: Record<AssetType, { label: string; icon: LucideIcon }> = {
  cash: { label: "Cash", icon: Banknote },
  bank: { label: "Bank account", icon: Wallet },
  property: { label: "Property", icon: Home },
  vehicle: { label: "Vehicle", icon: Car },
  gadget: { label: "Gadget", icon: Laptop },
  other: { label: "Other", icon: CreditCard },
};
