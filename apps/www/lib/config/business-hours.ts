/**
 * The one place the studio's clock lives. Every surface that shows "Cairo
 * time", lists call slots or checks a booked time against business hours reads
 * it from here, so the zone and the hours can never disagree between the
 * contact page, the schedule page and /api/schedule.
 *
 * Isomorphic on purpose: the schedule form (client) and its API route (server)
 * must agree on which slots exist.
 */

import { localeMeta } from "@/i18n/locale-meta";

/** IANA zone the business hours are stated in. */
const BUSINESS_TIME_ZONE = "Africa/Cairo";

/** Whole hours, 24-hour clock, in BUSINESS_TIME_ZONE. `end` is exclusive. */
const BUSINESS_HOURS = { start: 9, end: 18 } as const;

/** Spacing of the bookable call slots, in minutes. */
const SLOT_MINUTES = 15;

/** "HH:MM" slots from the first business hour up to, not including, the last. */
export const BUSINESS_SLOTS: readonly string[] = Array.from(
  { length: ((BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60) / SLOT_MINUTES },
  (_, index) => {
    const minutes = BUSINESS_HOURS.start * 60 + index * SLOT_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  },
);

export function isBusinessSlot(time: string): boolean {
  return BUSINESS_SLOTS.includes(time);
}

/** Wall-clock time in the business zone, e.g. "14:05". */
export function formatBusinessTime(locale: string, date: Date): string {
  return new Intl.DateTimeFormat(localeMeta(locale).intl, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

/**
 * The zone's UTC offset as a short label, derived rather than typed so it
 * follows Egypt's daylight saving: "GMT+3" in summer, "GMT+2" in winter.
 */
export function businessZoneOffsetLabel(date: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "GMT";
}

/** "9:00–18:00", Latin digits in every locale. */
export function formatBusinessHoursRange(): string {
  return `${BUSINESS_HOURS.start}:00–${BUSINESS_HOURS.end}:00`;
}

/**
 * The instant at which a calendar day's "HH:MM" occurs in the business zone.
 * A visitor in Riyadh who books 10:00 books 10:00 Cairo time, whatever their
 * browser's zone is. Resolves the zone offset for that very day, so daylight
 * saving transitions are respected.
 */
export function businessSlotToDate(
  year: number,
  monthIndex: number,
  day: number,
  time: string,
): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const guess = Date.UTC(year, monthIndex, day, hours, minutes);
  const offset = zoneOffsetMs(new Date(guess));
  // Re-read the offset at the corrected instant, in case the guess fell on
  // the other side of a daylight-saving switch.
  const corrected = guess - offset;
  return new Date(guess - zoneOffsetMs(new Date(corrected)));
}

function zoneOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  return asUtc - date.getTime();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
