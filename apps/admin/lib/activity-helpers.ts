/**
 * Server-safe formatting used by lib/activity.ts. Kept separate from
 * lib/format.ts so the activity builder does not pull date-fns into every
 * server component that only needs a currency string.
 */
export function money(amount: number, currency = "EGP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function titleCaseSafe(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
