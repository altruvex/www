import { formatDistanceToNowStrict, isToday, isYesterday, format } from "date-fns";
import { calendarDaysUntil } from "@/lib/payment-overdue";

export function money(
  amount: number | null | undefined,
  currency = "EGP",
  opts: { compact?: boolean } = {},
) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: opts.compact && Math.abs(amount) >= 10_000 ? "compact" : "standard",
  }).format(amount);
}

export function moneyByCurrency(byCurrency: Record<string, number>, compact = false) {
  const entries = Object.entries(byCurrency).filter(([, v]) => v !== 0);
  if (entries.length === 0) return "—";
  return entries.map(([c, v]) => money(v, c, { compact })).join(" + ");
}

export function sumByCurrency(
  items: { amount: number; currency: string }[],
): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const item of items) {
    sums[item.currency] = (sums[item.currency] ?? 0) + item.amount;
  }
  return sums;
}

export function scaleByCurrency(
  sums: Record<string, number>,
  factor: (currency: string) => number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sums).map(([currency, value]) => [
      currency,
      Math.round(value * factor(currency)),
    ]),
  );
}

export function number(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function percent(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function date(value: Date | string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function when(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function daysFromNow(value: Date | string | null | undefined) {
  if (!value) return null;
  return calendarDaysUntil(value);
}

export function dueLabel(value: Date | string | null | undefined) {
  const days = daysFromNow(value);
  if (days == null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

export function initials(name?: string | null, fallback = "??") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}

export function phone(value?: string | null) {
  if (!value) return "—";
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+20") && digits.length === 13)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  return value;
}

export function truncate(value: string | null | undefined, max = 80) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
