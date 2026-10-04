import type { BillingInterval } from "@repo/database";
import {
  maintenanceIntervalPrice,
  type MaintenancePlan,
} from "@repo/pricing-schema";

import { billedPlanPrice, MAINTENANCE_INTERVAL } from "@/lib/billing-interval";
import { INTERVAL_MONTHS, nextPeriodEnd } from "@/lib/subscription-lifecycle";

export function intervalOfPeriod(period: {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): BillingInterval | null {
  for (const interval of Object.keys(INTERVAL_MONTHS) as BillingInterval[]) {
    if (
      nextPeriodEnd(period.currentPeriodStart, interval).getTime() ===
      period.currentPeriodEnd.getTime()
    ) {
      return interval;
    }
  }
  return null;
}

export function periodInvoiceAmount(
  plan: Pick<MaintenancePlan, "price"> | null,
  quotedMonthlyPrice: number | null,
  interval: BillingInterval,
): number | null {
  const billed = billedPlanPrice(plan, quotedMonthlyPrice);
  return billed
    ? maintenanceIntervalPrice(billed, MAINTENANCE_INTERVAL[interval])
    : null;
}

export function currentPeriodInvoiceAmount(
  sub: {
    currentPeriodStart: Date | string;
    currentPeriodEnd: Date | string;
    quotedMonthlyPrice: number | null;
  },
  plan: Pick<MaintenancePlan, "price"> | null,
): number | null {
  const interval = intervalOfPeriod({
    currentPeriodStart: new Date(sub.currentPeriodStart),
    currentPeriodEnd: new Date(sub.currentPeriodEnd),
  });
  return interval
    ? periodInvoiceAmount(plan, sub.quotedMonthlyPrice, interval)
    : null;
}
