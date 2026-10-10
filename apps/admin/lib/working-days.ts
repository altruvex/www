/**
 * The working week, on the business calendar (BUSINESS_TIME_ZONE). One rule
 * for every sales day count — engine due/overdue, staleness, the follow-up
 * sweep, the call-outcome date prefill and its server check — so no screen
 * counts days its own way. Pure: no Prisma, no server-only import, safe in a
 * client component. Payments keep their own overdue rule (lib/payment-overdue.ts).
 *
 * Semantics:
 * - Friday and Saturday are non-working days.
 * - A due date that lands on a non-working day is effectively due on the next
 *   working day (a Friday follow-up is due Sunday).
 * - On a non-working day, "today" for due/overdue is the last working day, so
 *   a Thursday follow-up is due but not overdue on Friday and Saturday, and
 *   overdue on Sunday.
 * - Overdue = effective due day is before today's working day. Due = on or
 *   before it.
 * - Elapsed-day counts (staleness, "N days after sending") count working time
 *   only, in whole 24-hour working days; a "wait N days" date is N × 24
 *   working hours on. The reply promise runs on the same working-hour clock.
 *
 * Days are "YYYY-MM-DD" keys on the business calendar — never UTC dates, and
 * never the server's own zone.
 */
import { BUSINESS_TIME_ZONE, startOfBusinessDay } from "@/lib/payment-overdue";

/** Days of the week that are off (0 = Sunday … 6 = Saturday): Friday and Saturday. */
export const NON_WORKING_WEEKDAYS: ReadonlySet<number> = new Set([5, 6]);

const businessDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of an instant on the business calendar (never the UTC date). */
export const businessDayKey = (d: Date): string => businessDate.format(d);

// Day keys are walked as UTC-midnight dates, which makes the arithmetic zone-free.
const keyDate = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const shiftKey = (key: string, days: number) => {
  const d = keyDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
};

/** `days` calendar days after `key` (negative goes back). */
export const addCalendarDaysKey = shiftKey;

export function isWorkingDayKey(key: string): boolean {
  return !NON_WORKING_WEEKDAYS.has(keyDate(key).getUTCDay());
}

/** The day itself when it is a working day, else the next working day. */
export function nextWorkingDayKey(key: string): string {
  let k = key;
  while (!isWorkingDayKey(k)) k = shiftKey(k, 1);
  return k;
}

/**
 * The first working day at least `days` calendar days after `key` — the date a
 * follow-up or nurture review starts with. A landing on Friday/Saturday rolls to Sunday.
 */
export function workingDayAfterKey(key: string, days: number): string {
  return nextWorkingDayKey(shiftKey(key, days));
}

/** How far out a nurture review date starts (call-outcome sheet and every "Move to nurture" dialog). */
export const NURTURE_REVIEW_DAYS = 90;

/** The day itself when it is a working day, else the last working day before it. */
export function lastWorkingDayKey(key: string): string {
  let k = key;
  while (!isWorkingDayKey(k)) k = shiftKey(k, -1);
  return k;
}

/**
 * The `days`-th working day after `key` (0 = `key` rolled forward to a working
 * day). From a Thursday or a Friday, 2 working days is the Monday.
 */
export function addWorkingDaysKey(key: string, days: number): string {
  if (days <= 0) return nextWorkingDayKey(key);
  let k = key;
  for (let left = days; left > 0; left -= 1) k = nextWorkingDayKey(shiftKey(k, 1));
  return k;
}

/** Working days after `fromKey` up to and including `toKey`; 0 when `toKey` is not later. */
export function workingDaysBetweenKeys(fromKey: string, toKey: string): number {
  let n = 0;
  for (let k = shiftKey(fromKey, 1); k <= toKey; k = shiftKey(k, 1)) if (isWorkingDayKey(k)) n += 1;
  return n;
}

/** Milliseconds of working time between two instants (Friday and Saturday hours excluded). */
export function workingMsBetween(from: Date, to: Date): number {
  let total = 0;
  let key = businessDayKey(from);
  let at = from.getTime();
  const stop = to.getTime();
  while (at < stop) {
    const nextKey = shiftKey(key, 1);
    const end = Math.min(startOfBusinessDayKey(nextKey).getTime(), stop);
    if (isWorkingDayKey(key)) total += end - at;
    key = nextKey;
    at = end;
  }
  return total;
}

/**
 * Whole working days elapsed from `from` to `now`: working time divided into
 * 24-hour days, so a lead from 23:00 is not a day old at 00:30, and Friday and
 * Saturday add nothing (Thursday 13:00 → Sunday 13:00 is one working day).
 */
export function workingDaysSince(from: Date, now: Date): number {
  return Math.floor(workingMsBetween(from, now) / 86_400_000);
}

/** The working day a date is effectively due on. */
export const effectiveDueKey = (at: Date): string => nextWorkingDayKey(businessDayKey(at));

/** Today's working day: today, or the last working day when today is off. */
export const todayWorkingKey = (now: Date): string => lastWorkingDayKey(businessDayKey(now));

/** Due today or earlier, by the working day. */
export function isDueByWorkingDay(at: Date | null, now: Date): boolean {
  return at != null && effectiveDueKey(at) <= todayWorkingKey(now);
}

/** Effectively due before today's working day. */
export function isOverdueByWorkingDay(at: Date | null, now: Date): boolean {
  return at != null && effectiveDueKey(at) < todayWorkingKey(now);
}

/** Working days a date is past its effective due day; 0 when it is not overdue. */
export function workingDaysOverdue(at: Date, now: Date): number {
  return workingDaysBetweenKeys(effectiveDueKey(at), todayWorkingKey(now));
}

/** Start of a business day given by its key (noon UTC lies inside it in the business zone). */
export function startOfBusinessDayKey(key: string): Date {
  return startOfBusinessDay(new Date(`${key}T12:00:00Z`));
}

/**
 * The instant `hours` of working time after `from`: Friday and Saturday hours
 * do not run the clock. A lead arriving Thursday 15:00 with a 24-hour promise
 * is due Sunday 15:00; one arriving on Friday or Saturday starts at Sunday
 * 00:00 and is due Monday 00:00 (business time).
 */
export function addWorkingHours(from: Date, hours: number): Date {
  let key = businessDayKey(from);
  let at = from.getTime();
  let left = hours * 3_600_000;
  for (;;) {
    if (!isWorkingDayKey(key)) {
      key = nextWorkingDayKey(key);
      at = startOfBusinessDayKey(key).getTime();
    }
    const nextKey = shiftKey(key, 1);
    const end = startOfBusinessDayKey(nextKey).getTime();
    if (at + left <= end) return new Date(at + left);
    left -= end - at;
    key = nextKey;
    at = end;
  }
}

/** Beyond this many working days ahead, the due chip prints the date instead of a count. */
const MAX_COUNTED_DAYS_AHEAD = 7;

// A day key is a calendar date, not an instant: format its UTC midnight in UTC.
const dueDayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const dueDayMonthYear = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/**
 * The due chip for a sales next action, on the working-day rule: "2d overdue"
 * counts working days, a Thursday date reads "Due today" on Friday and
 * Saturday, and a Friday date is due Sunday. Up to 7 working days ahead it
 * counts ("Due in 3d"); further out it prints the date itself ("Due 8 Jan",
 * with the year when it is not the current business year), because a working-day
 * count for a date months away reads as the wrong number. Payments, tasks and
 * projects keep `dueLabel` (lib/format.ts), which counts calendar days.
 */
export function workingDueLabel(value: Date | string | null | undefined, now: Date = new Date()): string {
  if (!value) return "No date";
  const due = effectiveDueKey(new Date(value));
  const today = todayWorkingKey(now);
  if (due < today) return `${workingDaysBetweenKeys(due, today)}d overdue`;
  if (due === today) return "Due today";
  if (due === shiftKey(businessDayKey(now), 1)) return "Due tomorrow";
  const ahead = workingDaysBetweenKeys(today, due);
  if (ahead <= MAX_COUNTED_DAYS_AHEAD) return `Due in ${ahead}d`;
  const sameYear = due.slice(0, 4) === businessDayKey(now).slice(0, 4);
  return `Due ${(sameYear ? dueDayMonth : dueDayMonthYear).format(keyDate(due))}`;
}
