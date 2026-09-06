/**
 * Monthly billing cycles for maintenance retainers.
 *
 * A plan's request cap is per cycle, and the cycle runs from the day of the
 * month the subscription started — not from the 1st. So a subscription started
 * on the 15th caps requests 15th-to-14th, and "how many have I used" only
 * means something relative to that window.
 *
 * All arithmetic is UTC. Cycle boundaries decide whether a client is over their
 * cap, so they must not shift with the server's timezone or with daylight
 * saving.
 */

export interface BillingCycleWindow {
  /** Inclusive. */
  readonly start: Date;
  /** Exclusive — the next cycle's start. */
  readonly end: Date;
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * The anchor day, clamped to a month that is too short to contain it.
 *
 * A subscription anchored on the 31st bills on the 30th in April and the 28th
 * in a non-leap February. Clamping (rather than overflowing into the next
 * month, which is what `Date` does natively) keeps every cycle inside the month
 * it belongs to.
 */
function anchoredDate(year: number, monthIndex: number, anchorDay: number): Date {
  const day = Math.min(anchorDay, daysInUtcMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * The cycle containing `now`, for a subscription anchored at `startedAt`.
 *
 * Before the subscription's own start the first cycle is returned, so a
 * just-created subscription reads as "cycle 1" rather than as something in the
 * past.
 */
export function currentBillingCycle(startedAt: Date, now: Date): BillingCycleWindow {
  const anchorDay = startedAt.getUTCDate();

  if (now.getTime() < startedAt.getTime()) {
    return {
      start: startedAt,
      end: anchoredDate(
        startedAt.getUTCFullYear(),
        startedAt.getUTCMonth() + 1,
        anchorDay,
      ),
    };
  }

  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let start = anchoredDate(year, month, anchorDay);

  // `now` may sit before this month's anchor day, in which case the active
  // cycle opened last month.
  if (start.getTime() > now.getTime()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    start = anchoredDate(year, month, anchorDay);
  }

  // The first cycle never starts before the subscription did.
  if (start.getTime() < startedAt.getTime()) start = startedAt;

  return { start, end: anchoredDate(year, month + 1, anchorDay) };
}

/** Whole days until the cycle rolls over. Never negative. */
export function daysUntilCycleEnd(cycle: BillingCycleWindow, now: Date): number {
  const ms = cycle.end.getTime() - now.getTime();
  return Math.max(Math.ceil(ms / 86_400_000), 0);
}
