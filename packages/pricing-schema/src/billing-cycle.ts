export interface BillingCycleWindow {
  readonly start: Date;
  readonly end: Date;
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function anchoredDate(year: number, monthIndex: number, anchorDay: number): Date {
  const day = Math.min(anchorDay, daysInUtcMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

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

  if (start.getTime() > now.getTime()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    start = anchoredDate(year, month, anchorDay);
  }

  if (start.getTime() < startedAt.getTime()) start = startedAt;

  return { start, end: anchoredDate(year, month + 1, anchorDay) };
}

export function daysUntilCycleEnd(cycle: BillingCycleWindow, now: Date): number {
  const ms = cycle.end.getTime() - now.getTime();
  return Math.max(Math.ceil(ms / 86_400_000), 0);
}
