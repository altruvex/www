export const BUSINESS_TIME_ZONE = "Africa/Cairo";

const DAY = 86_400_000;

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface ZonedParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function zonedParts(instant: Date): ZonedParts {
  const read: Record<string, number> = {};
  for (const part of wallClock.formatToParts(instant)) {
    if (part.type !== "literal") read[part.type] = Number(part.value);
  }
  return {
    year: read.year,
    month: read.month,
    day: read.day,
    hour: read.hour,
    minute: read.minute,
    second: read.second,
  };
}

function offsetAt(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

export function startOfBusinessDay(instant: Date): Date {
  const p = zonedParts(instant);
  const midnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  let start = midnightAsUtc - offsetAt(instant);
  const offsetAtStart = offsetAt(new Date(start));
  if (offsetAtStart !== offsetAt(instant)) start = midnightAsUtc - offsetAtStart;
  return new Date(start);
}

export function calendarDaysUntil(value: Date | string, now: Date = new Date()): number {
  const from = startOfBusinessDay(now).getTime();
  const to = startOfBusinessDay(new Date(value)).getTime();
  return Math.round((to - from) / DAY);
}

export function overdueCutoff(now: Date = new Date()): Date {
  return startOfBusinessDay(now);
}

export function isPaymentOverdue(
  payment: { readonly status: string; readonly dueDate: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (payment.status !== "PENDING" && payment.status !== "OVERDUE") return false;
  if (payment.dueDate == null) return false;
  return new Date(payment.dueDate).getTime() < overdueCutoff(now).getTime();
}

export const DUE_SOON_DAYS = 14;

export function isPaymentDueSoon(
  payment: { readonly status: string; readonly dueDate: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (payment.status !== "PENDING" && payment.status !== "OVERDUE") return false;
  if (payment.dueDate == null) return false;
  if (isPaymentOverdue(payment, now)) return false;
  return calendarDaysUntil(payment.dueDate, now) <= DUE_SOON_DAYS;
}
