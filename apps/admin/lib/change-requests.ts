import { changeRequestQuoteDraft, type EmailDraft } from "./email-templates";
import { date, money } from "./format";

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

export const TERMINAL_STATUSES: readonly ChangeRequestStatusValue[] = [
  "DELIVERED",
  "DECLINED",
  "CANCELLED",
];

export function isOpen(status: string): boolean {
  return !TERMINAL_STATUSES.includes(status as ChangeRequestStatusValue);
}

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

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function formatHours(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, "");
  return `${text} h`;
}

export interface RevisionRates {
  revisionHourlyRate: number;
  revisionHourlyRateUsd: number;
}

export function rateFor(currency: string, rates: RevisionRates): number | null {
  if (currency === "EGP") return rates.revisionHourlyRate;
  if (currency === "USD") return rates.revisionHourlyRateUsd;
  return null;
}

export function hourlyAmount(minutes: number, rate: number): number {
  return Math.round((minutes / 60) * rate);
}

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

const DAY = 86_400_000;

export type WarrantyState = "not-launched" | "active" | "ended";

export interface WarrantyView {
  state: WarrantyState;
  endsAt: Date | null;
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

export function coveredByWarranty(
  requestedAt: Date,
  actualLaunchDate: Date | null | undefined,
  warrantyDays: number,
): boolean {
  if (!actualLaunchDate) return false;
  const endsAt = actualLaunchDate.getTime() + warrantyDays * DAY;
  return requestedAt.getTime() >= actualLaunchDate.getTime() && requestedAt.getTime() <= endsAt;
}

export interface ClosureCheck {
  id: "launched" | "payments" | "change-requests";
  ok: boolean;
  label: string;
  detail: string;
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
