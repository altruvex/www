import { changeRequestQuoteDraft, type EmailDraft } from "./email-templates";
import { date, money } from "./format";

/**
 * Change requests and project closure — the pure half.
 *
 * A client with no maintenance retainer can still ask for a change to a
 * project we delivered. Before this existed the only honest path was a new
 * proposal → contract → project chain with a 50/30/20 split, which is absurd
 * for a two-hour edit and leaves the work detached from the project it
 * changes. A change request hangs off the project instead.
 *
 * Deliberately isomorphic (no `server-only`, no Prisma client): the project
 * page, the server actions and `scripts/verify-change-requests.ts` all derive
 * the same transitions, quotes and warranty window from the same functions.
 *
 * Rules that hold here:
 *
 *  1. **No price is written in this file.** The hourly rate is the published
 *     revision rate from `@repo/pricing-schema` (override ?? default), passed
 *     in by the caller and snapshotted onto the row at quote time, so a later
 *     edit on /pricing cannot re-price work a client already agreed to.
 *  2. **Warranty is derived, never stored.** It is a pure function of the
 *     launch date, the published warranty length and the clock — the same
 *     posture as `deriveStatus` in `lib/subscription-lifecycle.ts`. Free work
 *     outside the window is not "warranty"; it is a fixed quote of zero, and
 *     it is recorded as exactly that.
 *  3. **Closing a project is a checklist, not a dropdown.** Unpaid payments
 *     and open change requests are soft blocks an OWNER can override; the
 *     override is written into the audit event.
 */

export const CHANGE_REQUEST_STATUSES = [
  "REQUESTED",
  "QUOTED",
  "APPROVED",
  "IN_PROGRESS",
  "DELIVERED",
  "DECLINED",
  "CANCELLED",
] as const;

export type ChangeRequestStatusValue = (typeof CHANGE_REQUEST_STATUSES)[number];

export type ChangeRequestPricingValue = "HOURLY" | "FIXED" | "WARRANTY";

/** Statuses nothing moves out of. */
export const TERMINAL_STATUSES: readonly ChangeRequestStatusValue[] = [
  "DELIVERED",
  "DECLINED",
  "CANCELLED",
];

export function isOpen(status: string): boolean {
  return !TERMINAL_STATUSES.includes(status as ChangeRequestStatusValue);
}

/**
 * Every legal move. QUOTED → QUOTED is a re-quote (the client pushed back on
 * the number). REQUESTED → APPROVED exists only for warranty cover, which
 * needs no quote; `canTransition` enforces that.
 */
const TRANSITIONS: Record<ChangeRequestStatusValue, readonly ChangeRequestStatusValue[]> = {
  REQUESTED: ["QUOTED", "APPROVED", "DECLINED", "CANCELLED"],
  QUOTED: ["QUOTED", "APPROVED", "DECLINED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  DECLINED: [],
  CANCELLED: [],
};

export function canTransition(
  from: string,
  to: ChangeRequestStatusValue,
  pricing?: string | null,
): boolean {
  const allowed = TRANSITIONS[from as ChangeRequestStatusValue];
  if (!allowed?.includes(to)) return false;
  if (from === "REQUESTED" && to === "APPROVED") return pricing === "WARRANTY";
  return true;
}

/* -------------------------------------------------------------------------- */
/* Hours and money                                                            */
/* -------------------------------------------------------------------------- */

/** The operator types hours; the row stores whole minutes. */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function formatHours(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, "");
  return `${text} h`;
}

/** The two revision rates the schema publishes, one per price list. */
export interface RevisionRates {
  revisionHourlyRate: number;
  revisionHourlyRateUsd: number;
}

/**
 * The published hourly rate for a project's currency, or null when there is
 * none. USD is its own price list, not a conversion (see `modifiers.ts`), so a
 * currency without a published rate cannot be quoted by the hour at all.
 */
export function rateFor(currency: string, rates: RevisionRates): number | null {
  if (currency === "EGP") return rates.revisionHourlyRate;
  if (currency === "USD") return rates.revisionHourlyRateUsd;
  return null;
}

export function hourlyAmount(minutes: number, rate: number): number {
  return Math.round((minutes / 60) * rate);
}

/** What gets billed on delivery. */
export function billedAmountFor(row: {
  pricing: string | null;
  hourlyRate: number | null;
  quotedAmount: number | null;
  actualMinutes: number | null;
}): number {
  if (row.pricing === "WARRANTY") return 0;
  if (row.pricing === "HOURLY") {
    if (row.hourlyRate == null || row.actualMinutes == null) {
      throw new Error("Hourly work needs its actual hours before it can be delivered.");
    }
    return hourlyAmount(row.actualMinutes, row.hourlyRate);
  }
  if (row.pricing === "FIXED") {
    if (row.quotedAmount == null) throw new Error("A fixed quote has no amount.");
    return row.quotedAmount;
  }
  throw new Error("This request was never priced.");
}

/* -------------------------------------------------------------------------- */
/* Warranty window                                                            */
/* -------------------------------------------------------------------------- */

const DAY = 86_400_000;

export type WarrantyState = "not-launched" | "active" | "ended";

export interface WarrantyView {
  state: WarrantyState;
  endsAt: Date | null;
  /** Whole days left, only while active. */
  daysLeft: number | null;
}

export function warrantyWindow(
  actualLaunchDate: Date | null | undefined,
  warrantyDays: number,
  now: Date = new Date(),
): WarrantyView {
  if (!actualLaunchDate) return { state: "not-launched", endsAt: null, daysLeft: null };
  const endsAt = new Date(actualLaunchDate.getTime() + warrantyDays * DAY);
  if (now.getTime() > endsAt.getTime()) return { state: "ended", endsAt, daysLeft: null };
  return {
    state: "active",
    endsAt,
    daysLeft: Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY)),
  };
}

/** Warranty is judged against when the client ASKED, not when we got to it. */
export function coveredByWarranty(
  requestedAt: Date,
  actualLaunchDate: Date | null | undefined,
  warrantyDays: number,
): boolean {
  if (!actualLaunchDate) return false;
  const endsAt = actualLaunchDate.getTime() + warrantyDays * DAY;
  return requestedAt.getTime() >= actualLaunchDate.getTime() && requestedAt.getTime() <= endsAt;
}

/* -------------------------------------------------------------------------- */
/* Closing a project                                                          */
/* -------------------------------------------------------------------------- */

export interface ClosureCheck {
  id: "launched" | "payments" | "change-requests";
  ok: boolean;
  label: string;
  detail: string;
  /** A failing check with `blocks` stops the close unless an OWNER overrides it. */
  blocks: boolean;
}

export function closureChecks(input: {
  phase: string;
  actualLaunchDate: Date | null;
  payments: { status: string; amount: number }[];
  changeRequests: { status: string }[];
}): ClosureCheck[] {
  const launched =
    input.phase === "LAUNCHED" || input.phase === "POST_LAUNCH_SUPPORT" || input.actualLaunchDate != null;
  const unpaid = input.payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const open = input.changeRequests.filter((c) => isOpen(c.status));

  return [
    {
      id: "launched",
      ok: launched,
      label: launched ? "Launched" : "Not launched",
      detail: launched
        ? "The project reached launch."
        : "The project never reached the Launched phase. Closing it now records it as finished anyway.",
      // Advisory only: a project can legitimately end before launch (the client
      // took the build in-house). Cancelled is the status for one that failed.
      blocks: false,
    },
    {
      id: "payments",
      ok: unpaid.length === 0,
      label:
        unpaid.length === 0
          ? "Every payment settled"
          : `${unpaid.length} payment${unpaid.length === 1 ? "" : "s"} still unpaid`,
      detail:
        unpaid.length === 0
          ? "Nothing is pending or overdue."
          : "A closed project drops out of the active list, and nobody chases money on a project that reads as finished.",
      blocks: unpaid.length > 0,
    },
    {
      id: "change-requests",
      ok: open.length === 0,
      label:
        open.length === 0
          ? "No open change requests"
          : `${open.length} change request${open.length === 1 ? "" : "s"} still open`,
      detail:
        open.length === 0
          ? "Change requests can still be logged after closing."
          : "Deliver, decline or cancel them first — or close anyway and keep working them.",
      blocks: open.length > 0,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* The quote a client receives                                                */
/* -------------------------------------------------------------------------- */

/**
 * Whether the client's quote page may accept an answer right now. The page
 * and the answer endpoint both ask this, so the page can never offer a button
 * the endpoint will refuse.
 */
export function quoteAnswerable(
  row: { status: string; quoteSentAt: Date | null; quoteExpiresAt: Date | null },
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: "answered" | "revising" | "expired" | "closed" } {
  if (row.status === "APPROVED" || row.status === "IN_PROGRESS" || row.status === "DELIVERED" || row.status === "DECLINED") {
    return { ok: false, reason: "answered" };
  }
  if (row.status === "CANCELLED") return { ok: false, reason: "closed" };
  if (row.status !== "QUOTED" || !row.quoteSentAt) return { ok: false, reason: "revising" };
  if (row.quoteExpiresAt && now.getTime() > row.quoteExpiresAt.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function quoteExpiry(sentAt: Date, validityDays: number): Date {
  return new Date(sentAt.getTime() + validityDays * DAY);
}

/**
 * The default wording for a quote, built from the row. One function for the
 * send dialog's pre-fill and the server's fallback, so they cannot drift.
 */
export function quoteDraftFor(
  row: { title: string; pricing: string | null; quotedAmount: number | null; estimatedMinutes: number | null; hourlyRate: number | null },
  clientName: string | null,
  currency: string,
  link: string,
  validUntil: Date | null,
): EmailDraft {
  return changeRequestQuoteDraft({
    clientName,
    title: row.title,
    amount: money(row.quotedAmount, currency),
    hourlyTerms:
      row.pricing === "HOURLY" && row.hourlyRate != null
        ? `${formatHours(row.estimatedMinutes)} estimated at ${money(row.hourlyRate, currency)} / hour`
        : null,
    validUntil: validUntil ? date(validUntil) : null,
    link,
  });
}
