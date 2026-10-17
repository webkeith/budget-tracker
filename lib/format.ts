import type { MonthKey } from "@/types";

export const CURRENCIES = [
  { code: "PHP", label: "Philippine Peso", locale: "en-PH" },
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "SGD", label: "Singapore Dollar", locale: "en-SG" },
  { code: "EUR", label: "Euro", locale: "en-IE" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "AUD", label: "Australian Dollar", locale: "en-AU" },
  { code: "JPY", label: "Japanese Yen", locale: "ja-JP" },
] as const;

export function currencySymbol(currency: string, locale = "en-US"): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatNumber(value: number, locale = "en-US", forceDecimals = false): string {
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.0001;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasCents || forceDecimals ? 2 : 0,
    maximumFractionDigits: hasCents || forceDecimals ? 2 : 0,
  }).format(rounded);
}

export function formatMoney(value: number, currency = "PHP", locale = "en-US"): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${currencySymbol(currency, locale)}${formatNumber(Math.abs(value), locale)}`;
}

export function formatCompact(value: number, currency = "PHP", locale = "en-US"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const sym = currencySymbol(currency, locale);
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  return toMonthKey(new Date(year, month + delta, 1));
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthLabel(key: MonthKey, style: "long" | "short" = "long"): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: style,
    year: style === "long" ? "numeric" : undefined,
  });
}

export function currentBudgetMonth(startDay: number, today = new Date()): MonthKey {
  if (startDay > 1 && today.getDate() < startDay) {
    return toMonthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  }
  return toMonthKey(today);
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", opts);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
