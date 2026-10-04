import type { ClientServiceKind, ClientServiceStatus, Prisma } from "@repo/database";

import type { ProposalService } from "./proposal-schema";
import { addMonths, DAY_MS } from "./subscription-lifecycle";

export const CLIENT_SERVICE_KINDS = [
  "DOMAIN",
  "HOSTING",
  "BUSINESS_EMAIL",
  "SSL_CERTIFICATE",
  "SOFTWARE_LICENSE",
  "OTHER",
] as const satisfies readonly ClientServiceKind[];

export const KIND_LABEL: Record<ClientServiceKind, string> = {
  DOMAIN: "Domain",
  HOSTING: "Hosting",
  BUSINESS_EMAIL: "Business email",
  SSL_CERTIFICATE: "SSL certificate",
  SOFTWARE_LICENSE: "Software licence",
  OTHER: "Other",
};

export function isOneTime(service: { termMonths: number | null }): boolean {
  return service.termMonths === null;
}

export const DEFAULT_TERM_MONTHS: Record<ClientServiceKind, number> = {
  DOMAIN: 12,
  HOSTING: 12,
  BUSINESS_EMAIL: 12,
  SSL_CERTIFICATE: 12,
  SOFTWARE_LICENSE: 12,
  OTHER: 12,
};

export const ALERT_THRESHOLDS = [30, 14, 7, 1, 0] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

export const SERVICE_SOON_DAYS = ALERT_THRESHOLDS[0];

export const SERVICE_URGENT_DAYS = 7;

export type ServiceState =
  | "pending"
  | "active"
  | "one-time"
  | "renewing-soon"
  | "urgent"
  | "expired"
  | "cancelled";

export interface ServiceLifecycleInput {
  status: ClientServiceStatus;
  expiresAt: Date | null;
  termMonths: number | null;
}

export function daysUntilExpiry(expiresAt: Date, now: Date = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
}

export function serviceState(
  service: ServiceLifecycleInput,
  now: Date = new Date(),
): ServiceState {
  if (service.status === "CANCELLED") return "cancelled";
  if (service.status === "PENDING") return "pending";
  if (isOneTime(service)) return "one-time";
  if (!service.expiresAt) return "pending";

  if (service.expiresAt.getTime() <= now.getTime()) return "expired";
  const days = daysUntilExpiry(service.expiresAt, now);
  if (days <= SERVICE_URGENT_DAYS) return "urgent";
  if (days <= SERVICE_SOON_DAYS) return "renewing-soon";
  return "active";
}

export function needsAttention(state: ServiceState): boolean {
  return state === "renewing-soon" || state === "urgent" || state === "expired";
}

export function crossedThreshold(
  service: ServiceLifecycleInput,
  now: Date = new Date(),
): AlertThreshold | null {
  if (service.status !== "ACTIVE" || !service.expiresAt || isOneTime(service)) return null;
  const days = Math.max(0, daysUntilExpiry(service.expiresAt, now));
  let crossed: AlertThreshold | null = null;
  for (const threshold of ALERT_THRESHOLDS) {
    if (days <= threshold) crossed = threshold;
  }
  return crossed;
}

export function renewalAlertKey(
  serviceId: string,
  expiresAt: Date,
  threshold: AlertThreshold,
): string {
  return `service:${serviceId}:${expiresAt.toISOString().slice(0, 10)}:${threshold}`;
}

export function nextExpiry(
  service: { expiresAt: Date | null; termMonths: number },
  now: Date = new Date(),
): Date {
  const term = Math.max(1, Math.round(service.termMonths));
  const anchor = service.expiresAt ?? now;
  const next = addMonths(anchor, term);
  return next.getTime() > now.getTime() ? next : addMonths(now, term);
}

export function firstExpiry(startedAt: Date, termMonths: number): Date {
  return addMonths(startedAt, Math.max(1, Math.round(termMonths)));
}

export function renewRefusal(service: ServiceLifecycleInput): string | null {
  if (isOneTime(service)) return "A one-time service is bought once and never renews.";
  if (service.status !== "ACTIVE" || !service.expiresAt) {
    return "Only an active service with an expiry date can be renewed.";
  }
  return null;
}

export function annualised(price: number, termMonths: number | null): number {
  if (termMonths === null) return 0;
  const term = Math.max(1, termMonths);
  return Math.round((price * 12) / term);
}

export function termLabel(termMonths: number | null): string {
  if (termMonths === null) return "One-time";
  if (termMonths === 1) return "Monthly";
  if (termMonths === 3) return "Quarterly";
  if (termMonths === 6) return "Every 6 months";
  if (termMonths === 12) return "Annual";
  if (termMonths % 12 === 0) return `Every ${termMonths / 12} years`;
  return `Every ${termMonths} months`;
}

export function perTermLabel(termMonths: number | null): string {
  if (termMonths === null) return "one-time";
  if (termMonths === 1) return "/ month";
  if (termMonths === 12) return "/ year";
  if (termMonths % 12 === 0) return `/ ${termMonths / 12} years`;
  return `/ ${termMonths} months`;
}

export function servicesFromProposal(input: {
  services: ProposalService[];
  clientId: string;
  projectId: string;
  proposalId: string;
  currency: string;
  createdBy: string;
}): Prisma.ClientServiceCreateManyInput[] {
  return input.services.map((service) => ({
    clientId: input.clientId,
    projectId: input.projectId,
    proposalId: input.proposalId,
    kind: service.kind,
    name: service.name,
    provider: service.provider?.trim() || null,
    status: "PENDING",
    currency: input.currency,
    price: service.price,
    termMonths: service.termMonths,
    firstTermIncluded: service.termMonths === null ? false : service.firstTermIncluded,
    createdBy: input.createdBy,
  }));
}

export type TermBilling =
  | { bill: true; amount: number; dueDate: Date }
  | { bill: false; reason: string };

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
      reason:
        "The service is not linked to a project, and a payment row always sits on a project's schedule. The term was extended; nothing is owed in this system until you record the payment on the payments screen or link the service to a project.",
    };
  }
  if (input.projectCurrency !== input.currency) {
    return {
      bill: false,
      reason: `The service is priced in ${input.currency} but the project bills in ${input.projectCurrency}, and a schedule never mixes currencies. The term was extended; record the ${input.currency} payment on the payments screen.`,
    };
  }
  return { bill: true, amount: input.price, dueDate: input.termStart };
}

export function remindedThisCycle(service: {
  expiresAt: Date | string | null;
  reminderSentFor: Date | string | null;
}): boolean {
  if (!service.expiresAt || !service.reminderSentFor) return false;
  return new Date(service.expiresAt).getTime() === new Date(service.reminderSentFor).getTime();
}

export function expiryPhrase(expiresAt: Date, now: Date = new Date()): string {
  if (expiresAt.getTime() <= now.getTime()) {
    const ago = Math.floor((now.getTime() - expiresAt.getTime()) / DAY_MS);
    return ago === 0 ? "expired today" : `expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  const days = daysUntilExpiry(expiresAt, now);
  return days === 1 ? "expires tomorrow" : `expires in ${days} days`;
}
