import { pricingCopy, type Currency } from "@repo/pricing-schema";

/**
 * What a payment row bills, for the screens that list payments.
 *
 * A payment carries no currency or name of its own. A project payment reads
 * both from its contract; a retainer payment (`Payment.subscriptionId`) has
 * no contract, so it reads them from the plan it renews. Maintenance plans
 * are published in EGP (`MaintenancePlan.price` in @repo/pricing-schema), and
 * that is the only currency a retainer invoice can be in.
 */
export const RETAINER_CURRENCY: Currency = "EGP";

export interface PaymentProjectSource {
  readonly contract: { readonly proposal: { readonly currency: string } };
}

export interface PaymentSubscriptionSource {
  readonly planId: string;
}

export function paymentCurrency(payment: {
  readonly project: PaymentProjectSource | null;
}): string {
  return payment.project?.contract.proposal.currency ?? RETAINER_CURRENCY;
}

/** "Essential retainer" — the plan's name, or its id when the schema no longer knows it. */
export function retainerLabel(subscription: PaymentSubscriptionSource): string {
  const copy = pricingCopy("en").maintenance;
  const plan = (copy as Record<string, { name: string } | undefined>)[subscription.planId];
  return `${plan?.name ?? subscription.planId} retainer`;
}

/**
 * The line a list names the payment by: the service term, the project, or the
 * retainer's plan. A service term names the service it renews because the
 * project is only where it is billed; a retainer payment whose subscription
 * was deleted keeps the row and says so.
 */
export function paymentSourceLabel(payment: {
  readonly project: { readonly name: string } | null;
  readonly subscription: PaymentSubscriptionSource | null;
  readonly service?: { readonly name: string } | null;
}): string {
  if (payment.service) return payment.service.name;
  if (payment.project) return payment.project.name;
  if (payment.subscription) return retainerLabel(payment.subscription);
  return "Retainer (deleted)";
}

/**
 * The record a payment bills, as an entity-link target: the service term's
 * service, the project, or the retainer. Null only for a retainer payment
 * whose subscription has since been deleted — there is nothing left to open.
 */
export function paymentSourceEntity(payment: {
  readonly projectId?: string | null;
  readonly subscriptionId?: string | null;
  readonly serviceId?: string | null;
}): { readonly type: "client_service" | "project" | "subscription"; readonly id: string } | null {
  if (payment.serviceId) return { type: "client_service", id: payment.serviceId };
  if (payment.projectId) return { type: "project", id: payment.projectId };
  if (payment.subscriptionId) return { type: "subscription", id: payment.subscriptionId };
  return null;
}

/** Where the payment is managed from: the project's financials, or /maintenance. */
export function paymentSourceHref(payment: {
  readonly project: { readonly id: string } | null;
}): string {
  return payment.project ? `/projects/${payment.project.id}?tab=financials` : "/maintenance";
}

/**
 * How money arrived, as the operator records it. `Payment.method` is free text
 * in the schema; these are the values the Record-payment dialog writes, and
 * the labels every list reads them back with. An older row holding another
 * string is shown verbatim rather than hidden.
 */
export const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentMethodLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return isPaymentMethod(value) ? PAYMENT_METHOD_LABEL[value] : value;
}
