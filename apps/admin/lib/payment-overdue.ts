/**
 * When a payment is late (ruling 2026-10-03).
 *
 * A PENDING payment is OVERDUE from the calendar day AFTER its due date, not
 * from the due instant. A renewal invoice opened at 02:05 today used to read
 * "Overdue · Due today" by the afternoon — two claims that cannot both be true.
 * Due today is still due today; tomorrow it is late.
 *
 * "Today" is the business day, not the server's. Vercel runs in UTC and a
 * laptop runs wherever it sits, so the cut-off is computed in one named zone
 * with Intl — no library, and DST-safe because the zone's own offset is read
 * for the instant in question rather than assumed.
 *
 * Nothing here writes: OVERDUE stays derived, like the subscription and service
 * lifecycles. Deliberately not `server-only` — the tables, the action centre
 * and the labels in client components all read the same rule, and the day
 * arithmetic for `dueLabel` lives here so a row cannot read "1d overdue" while
 * its status still says pending.
 */

/** The studio bills in EGP and chases from Cairo; a due date means the end of that day there. */
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

/** The zone's UTC offset at `instant`, in ms (positive east of Greenwich). */
function offsetAt(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant the business day containing `instant` began (00:00 in the zone,
 * or the first instant after a spring-forward gap). Egypt's clocks change at
 * midnight, so the offset at `instant` and at that day's start can differ;
 * the second pass re-reads the offset at the guess and corrects it.
 */
export function startOfBusinessDay(instant: Date): Date {
  const p = zonedParts(instant);
  const midnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  let start = midnightAsUtc - offsetAt(instant);
  const offsetAtStart = offsetAt(new Date(start));
  if (offsetAtStart !== offsetAt(instant)) start = midnightAsUtc - offsetAtStart;
  return new Date(start);
}

/**
 * Whole business days from `now`'s day to `value`'s day. 0 = today,
 * 1 = tomorrow, negative = that many days ago. Compares days, not instants,
 * so a due date earlier today is still 0 at midnight-minus-one.
 */
export function calendarDaysUntil(value: Date | string, now: Date = new Date()): number {
  const from = startOfBusinessDay(now).getTime();
  const to = startOfBusinessDay(new Date(value)).getTime();
  // A day holding a DST change is 23 or 25 hours long; rounding absorbs it.
  return Math.round((to - from) / DAY);
}

/** A payment is late once its due date is before this instant: the start of today. */
export function overdueCutoff(now: Date = new Date()): Date {
  return startOfBusinessDay(now);
}

/**
 * Whether an unpaid payment reads OVERDUE at `now`. Stored OVERDUE still has to
 * clear the cutoff — a row that was set by hand with a due date today is due
 * today, not late — and PAID / WAIVED are never late.
 */
export function isPaymentOverdue(
  payment: { readonly status: string; readonly dueDate: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (payment.status !== "PENDING" && payment.status !== "OVERDUE") return false;
  if (payment.dueDate == null) return false;
  return new Date(payment.dueDate).getTime() < overdueCutoff(now).getTime();
}

/**
 * The "coming up" window the Today page and the Billing `?status=due` filter
 * share: an unpaid payment due within this many calendar days, today included.
 * Fourteen days because that is one chasing cycle — long enough to send the
 * reminder, short enough that the list is not every invoice in the quarter.
 */
export const DUE_SOON_DAYS = 14;

/**
 * Whether a PENDING payment is due within the coming window: not yet late
 * (see `isPaymentOverdue`) and no further out than `DUE_SOON_DAYS`. A payment
 * with no due date is neither late nor due soon — it has no date to be near.
 */
export function isPaymentDueSoon(
  payment: { readonly status: string; readonly dueDate: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (payment.status !== "PENDING" && payment.status !== "OVERDUE") return false;
  if (payment.dueDate == null) return false;
  if (isPaymentOverdue(payment, now)) return false;
  return calendarDaysUntil(payment.dueDate, now) <= DUE_SOON_DAYS;
}
