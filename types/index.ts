export type ID = string;
export type MonthKey = string;

export type IncomeFrequency = "monthly" | "bimonthly" | "one-time";
export type IncomeSourceType = "salary" | "freelance" | "business" | "other";

export type PayoutStatus = "expected" | "received" | "needs-amount" | "skipped";

export interface Income {
  id: ID;
  month: MonthKey;
  name: string;
  type: IncomeSourceType;
  amount: number;
  frequency: IncomeFrequency;
  dateReceived?: string;
  clientId?: ID;
  periodStart?: string;
  periodEnd?: string;
  status?: PayoutStatus;
  hours?: number;
  note?: string;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PaySchedule =
  | { kind: "weekly"; weekday: Weekday }
  | { kind: "biweekly"; anchor: string }
  | { kind: "semimonthly"; day1: number; day2: number | "last" }
  | { kind: "monthly"; day: number | "last" };

export type ClientPayType = "fixed" | "variable";
export type ClientStatus = "active" | "paused" | "terminated";
export type TerminationReason = "contract-ended" | "stopped-paying" | "project-finished" | "other";

export interface ClientRate {
  amount: number;
  from: string;
}

export interface ClientPeriod {
  start: string;
  end?: string;
}

export interface Client {
  id: ID;
  name: string;
  company?: string;
  notes?: string;
  color: string;
  payType: ClientPayType;
  schedule: PaySchedule;
  rates: ClientRate[];
  hourlyRate?: number;
  periods: ClientPeriod[];
  status: ClientStatus;
  endReason?: TerminationReason;
  endNote?: string;
  trackFrom: string;
  backfill: boolean;
}

export interface Payout extends Income {
  clientId: ID;
  periodStart: string;
  periodEnd: string;
  status: PayoutStatus;
  virtual: boolean;
  payType: ClientPayType;
}

export type PayableCategory = "insurance" | "loan" | "bill" | "subscription";
export type PayableStatus = "paid" | "unpaid" | "overdue";
export type PaymentFrequency = "monthly" | "quarterly" | "semi-annual" | "annual";

export interface LoanDetails {
  principal: number;
  remainingBalance: number;
  interestRate?: number;
  endDate?: string;
}

export interface InsuranceDetails {
  provider: string;
  coverageType: string;
  paymentFrequency: PaymentFrequency;
  renewalDate?: string;
}

export interface Payable {
  id: ID;
  month: MonthKey;
  name: string;
  amount: number;
  dueDay: number;
  category: PayableCategory;
  status: PayableStatus;
  loan?: LoanDetails;
  insurance?: InsuranceDetails;
}

export type ResponsibilityFrequency = "weekly" | "monthly" | "quarterly" | "annual" | "one-time";

export interface Responsibility {
  id: ID;
  month: MonthKey;
  name: string;
  recipient: string;
  amount: number;
  frequency: ResponsibilityFrequency;
  notes?: string;
}

export interface Expense {
  id: ID;
  month: MonthKey;
  name: string;
  amount: number;
  date?: string;
}

export interface SavingsFund {
  id: ID;
  name: string;
  isEmergency: boolean;
  target: number;
  current: number;
  monthlyContribution: number;
}

export type InvestmentType =
  | "stocks"
  | "mutual-fund"
  | "crypto"
  | "mp2"
  | "time-deposit"
  | "business"
  | "other";

export interface Investment {
  id: ID;
  name: string;
  type: InvestmentType;
  invested: number;
  currentValue: number;
  monthlyContribution: number;
  dateStarted?: string;
}

export type WishPriority = "need" | "want";

export interface WishItem {
  id: ID;
  name: string;
  price: number;
  priority: WishPriority;
  targetDate?: string;
  setAside: number;
  bought?: boolean;
  boughtDate?: string;
}

export type AssetType = "cash" | "bank" | "property" | "vehicle" | "gadget" | "other";

export interface Asset {
  id: ID;
  name: string;
  type: AssetType;
  value: number;
  dateAcquired?: string;
}

export interface NetWorthSnapshot {
  month: MonthKey;
  value: number;
}

export interface Settings {
  currency: string;
  locale: string;
  startDay: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  clients: Client[];
  incomes: Income[];
  payables: Payable[];
  responsibilities: Responsibility[];
  expenses: Expense[];
  savings: SavingsFund[];
  investments: Investment[];
  wishlist: WishItem[];
  assets: Asset[];
  netWorthHistory: NetWorthSnapshot[];
}

export type CollectionKey = Exclude<keyof AppData, "version" | "settings" | "netWorthHistory">;

export type ModuleKey =
  | "clients"
  | "income"
  | "payables"
  | "responsibilities"
  | "expenses"
  | "savings"
  | "investments"
  | "planning"
  | "assets";

export type Affordability = "affordable" | "on-track" | "not-yet";
