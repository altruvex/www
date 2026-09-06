import { formatDistanceToNowStrict, isToday, isYesterday, format } from "date-fns";

/**
 * Money. Always tabular, always with an explicit currency — this app deals in
 * EGP and USD simultaneously and a bare number is a bug waiting to be a wire
 * transfer. `compact` is for stat tiles only; tables always show the full value.
 */
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

/** Several currencies summed separately — never added together. */
export function moneyByCurrency(byCurrency: Record<string, number>, compact = false) {
  const entries = Object.entries(byCurrency).filter(([, v]) => v !== 0);
  if (entries.length === 0) return "—";
  return entries.map(([c, v]) => money(v, c, { compact })).join(" + ");
}

/**
 * Sum amounts KEEPING them apart by currency. Adding an EGP figure to a USD one
 * produces a number that is true in no currency at all — the one arithmetic this
 * application must never do.
 */
export function sumByCurrency(
  items: { amount: number; currency: string }[],
): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const item of items) {
    sums[item.currency] = (sums[item.currency] ?? 0) + item.amount;
  }
  return sums;
}

/** Scale every currency in a bucket by the same factor (weighting, averaging). */
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

/** Absolute date, for anything a person might quote back to a client. */
export function date(value: Date | string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

/**
 * Relative time for activity feeds. Today and yesterday get the clock time
 * because "18 hours ago" is useless when deciding whether to chase someone.
 */
export function when(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

/** Signed day delta against now. Negative = overdue. */
export function daysFromNow(value: Date | string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

export function dueLabel(value: Date | string | null | undefined) {
  const days = daysFromNow(value);
  if (days == null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

/** Short id for display: the first block of a uuid, uppercased. */
export function shortId(id: string) {
  return id.split("-")[0].toUpperCase();
}

export function initials(name?: string | null, fallback = "??") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}

/** E.164-ish phone display; leaves anything unexpected untouched. */
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
