import type { ClientServiceKind, ClientServiceStatus } from "@repo/database";

import { addMonths, DAY_MS } from "./subscription-lifecycle";

/**
 * Client services — domains, hosting, business email — and the renewal rules
 * behind them.
 *
 * Same split as the retainers (lib/subscription-lifecycle.ts):
 *
 *   - **Stored status** is what an operator decided: PENDING (agreed, not yet
 *     registered), ACTIVE, CANCELLED.
 *   - **State** is what the calendar says about an ACTIVE service: fine,
 *     renewing soon, about to lapse, lapsed. It is never written, so the
 *     renewals screen is right on a system whose cron job has not run in a week.
 *
 * Deliberately isomorphic, like its sibling: the proposal editor (client), the
 * renewals page (server) and the alert sweep must all read a service the same
 * way. It touches no database and no secret.
 */

/** Mirrors the Prisma enum. `satisfies` makes a drift a type error. */
export const CLIENT_SERVICE_KINDS = [
  "DOMAIN",
  "HOSTING",
  "BUSINESS_EMAIL",
  "SSL_CERTIFICATE",
  "SOFTWARE_LICENSE",
  "OTHER",
] as const satisfies readonly ClientServiceKind[];

export const CLIENT_SERVICE_STATUSES = [
  "PENDING",
  "ACTIVE",
  "CANCELLED",
] as const satisfies readonly ClientServiceStatus[];

export const KIND_LABEL: Record<ClientServiceKind, string> = {
  DOMAIN: "Domain",
  HOSTING: "Hosting",
  BUSINESS_EMAIL: "Business email",
  SSL_CERTIFICATE: "SSL certificate",
  SOFTWARE_LICENSE: "Software licence",
  OTHER: "Other",
};

/** Starting term per kind, used only to pre-fill a form. Always editable. */
export const DEFAULT_TERM_MONTHS: Record<ClientServiceKind, number> = {
  DOMAIN: 12,
  HOSTING: 12,
  BUSINESS_EMAIL: 12,
  SSL_CERTIFICATE: 12,
  SOFTWARE_LICENSE: 12,
  OTHER: 12,
};

/**
 * Days before expiry at which an alert is raised, largest first.
 *
 * 30 is enough to invoice the client and get paid before the date; 7 and 1 are
 * the "this is now your problem" reminders; 0 is the day it lapses. Each is
 * notified once per renewal cycle — see `renewalAlertKey`.
 */
export const ALERT_THRESHOLDS = [30, 14, 7, 1, 0] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

/** Horizon for "renewing soon" on every surface. The first alert threshold. */
export const SERVICE_SOON_DAYS = ALERT_THRESHOLDS[0];

/** Inside this many days a renewal stops being planning and becomes urgent. */
export const SERVICE_URGENT_DAYS = 7;

export type ServiceState =
  | "pending"
  | "active"
  | "renewing-soon"
  | "urgent"
  | "expired"
  | "cancelled";

export interface ServiceLifecycleInput {
  status: ClientServiceStatus;
  expiresAt: Date | null;
}

/**
 * Whole days until expiry, negative once it has passed.
 *
 * Ceil, not floor: something expiring tomorrow afternoon is "1 day", and
 * something that expired an hour ago is already "0" → expired, never "-0".
 */
export function daysUntilExpiry(expiresAt: Date, now: Date = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
}

export function serviceState(
  service: ServiceLifecycleInput,
  now: Date = new Date(),
): ServiceState {
  if (service.status === "CANCELLED") return "cancelled";
  // ACTIVE without a date cannot happen through the API, but a row edited by
  // hand could carry it. Treating it as pending keeps it visible and silent
  // rather than inventing an expiry.
  if (service.status === "PENDING" || !service.expiresAt) return "pending";

  if (service.expiresAt.getTime() <= now.getTime()) return "expired";
  const days = daysUntilExpiry(service.expiresAt, now);
  if (days <= SERVICE_URGENT_DAYS) return "urgent";
  if (days <= SERVICE_SOON_DAYS) return "renewing-soon";
  return "active";
}

/** States that need somebody to do something. */
export function needsAttention(state: ServiceState): boolean {
  return state === "renewing-soon" || state === "urgent" || state === "expired";
}

/**
 * The tightest threshold an active service has crossed, or null when it is
 * outside every one.
 *
 * "Tightest" matters when the sweep has not run for a while: a service that
 * went from 20 days to 5 days in one gap raises the 7-day alert, not a stale
 * 14-day one followed immediately by a second message.
 */
export function crossedThreshold(
  service: ServiceLifecycleInput,
  now: Date = new Date(),
): AlertThreshold | null {
  if (service.status !== "ACTIVE" || !service.expiresAt) return null;
  const days = Math.max(0, daysUntilExpiry(service.expiresAt, now));
  let crossed: AlertThreshold | null = null;
  for (const threshold of ALERT_THRESHOLDS) {
    if (days <= threshold) crossed = threshold;
  }
  return crossed;
}

/**
 * Identity of one alert: this service, this renewal cycle, this threshold.
 *
 * The expiry date is part of the key on purpose. After a renewal moves
 * `expiresAt` forward a year, the same thresholds must fire again — keyed on
 * the service alone they would be suppressed forever after the first year.
 */
export function renewalAlertKey(
  serviceId: string,
  expiresAt: Date,
  threshold: AlertThreshold,
): string {
  return `service:${serviceId}:${expiresAt.toISOString().slice(0, 10)}:${threshold}`;
}

/**
 * The expiry a renewal moves a service to.
 *
 * Anchored to the old expiry, not to `now` — a domain renewed three days early
 * keeps its date, and one renewed three days late does not quietly lose three
 * days. But a registrar renews a service that lapsed long ago from the day it
 * is restored, not from a date years in the past, so a new expiry that would
 * still be behind the clock is re-anchored to today.
 */
export function nextExpiry(
  service: { expiresAt: Date | null; termMonths: number },
  now: Date = new Date(),
): Date {
  const term = Math.max(1, Math.round(service.termMonths));
  const anchor = service.expiresAt ?? now;
  const next = addMonths(anchor, term);
  return next.getTime() > now.getTime() ? next : addMonths(now, term);
}

/** Expiry for a service activated on `startedAt`. */
export function firstExpiry(startedAt: Date, termMonths: number): Date {
  return addMonths(startedAt, Math.max(1, Math.round(termMonths)));
}

/**
 * The price normalised to twelve months, for "what does this client pay us a
 * year in services". A two-year domain at 1,000 is 500 a year, not 1,000.
 */
export function annualised(price: number, termMonths: number): number {
  const term = Math.max(1, termMonths);
  return Math.round((price * 12) / term);
}

/** "Annual", "Monthly", "Every 24 months". */
export function termLabel(termMonths: number): string {
  if (termMonths === 1) return "Monthly";
  if (termMonths === 3) return "Quarterly";
  if (termMonths === 6) return "Every 6 months";
  if (termMonths === 12) return "Annual";
  if (termMonths % 12 === 0) return `Every ${termMonths / 12} years`;
  return `Every ${termMonths} months`;
}

/** "per year", "per month" — the unit after a price. */
export function perTermLabel(termMonths: number): string {
  if (termMonths === 1) return "/ month";
  if (termMonths === 12) return "/ year";
  if (termMonths % 12 === 0) return `/ ${termMonths / 12} years`;
  return `/ ${termMonths} months`;
}

/* -------------------------------------------------------------------------- */
/* Billing a term                                                             */
/* -------------------------------------------------------------------------- */

export type TermBilling =
  | { bill: true; amount: number; dueDate: Date }
  | { bill: false; reason: string };

/**
 * Whether registering or renewing a service opens a payment, and why not when
 * it does not.
 *
 * A payment row has no currency of its own — it bills in its project's
 * currency (payment → project → contract → proposal). So a term is only put on
 * the schedule when there IS a project and the service is priced in that
 * project's currency. Anything else would print a USD price as EGP on
 * /payments, which is the one arithmetic this application must never do; it is
 * refused with a reason the operator can act on instead.
 *
 * Due on the day the term starts: the registration date, or — for a renewal —
 * the old expiry, which is the first day of the term being bought.
 */
export function termBilling(input: {
  event: "activate" | "renew";
  price: number;
  currency: string;
  firstTermIncluded: boolean;
  projectId: string | null;
  projectCurrency: string | null;
  termStart: Date;
}): TermBilling {
  if (input.event === "activate" && input.firstTermIncluded) {
    return {
      bill: false,
      reason: "The first term is inside the project fee — the first invoice is at renewal.",
    };
  }
  if (!(input.price > 0)) {
    return { bill: false, reason: "The service has no price, so there is nothing to invoice." };
  }
  if (!input.projectId || !input.projectCurrency) {
    return {
      bill: false,
      reason: "Not linked to a project, so there is no payment schedule to put it on — invoice it by hand.",
    };
  }
  if (input.projectCurrency !== input.currency) {
    return {
      bill: false,
      reason: `Priced in ${input.currency} but the project bills in ${input.projectCurrency} — invoice it by hand.`,
    };
  }
  return { bill: true, amount: input.price, dueDate: input.termStart };
}

/** Whether the client has been told about the renewal coming up now. */
export function remindedThisCycle(service: {
  expiresAt: Date | string | null;
  reminderSentFor: Date | string | null;
}): boolean {
  if (!service.expiresAt || !service.reminderSentFor) return false;
  return new Date(service.expiresAt).getTime() === new Date(service.reminderSentFor).getTime();
}

/** One line for a countdown: "in 12 days", "today", "3 days ago". */
export function expiryPhrase(expiresAt: Date, now: Date = new Date()): string {
  if (expiresAt.getTime() <= now.getTime()) {
    const ago = Math.floor((now.getTime() - expiresAt.getTime()) / DAY_MS);
    return ago === 0 ? "expired today" : `expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  const days = daysUntilExpiry(expiresAt, now);
  return days === 1 ? "expires tomorrow" : `expires in ${days} days`;
}
