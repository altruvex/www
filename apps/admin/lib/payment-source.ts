import { pricingCopy, type Currency } from "@repo/pricing-schema";
import { projectCurrency, type ProjectCurrencySource } from "./project-currency";

export const RETAINER_CURRENCY: Currency = "EGP";

export type PaymentProjectSource = ProjectCurrencySource;

export interface PaymentSubscriptionSource {
  readonly planId: string;
}

export function paymentCurrency(payment: {
  readonly project: PaymentProjectSource | null;
}): string {
  return payment.project ? projectCurrency(payment.project) : RETAINER_CURRENCY;
}

export function retainerLabel(subscription: PaymentSubscriptionSource): string {
  const copy = pricingCopy("en").maintenance;
  const plan = (copy as Record<string, { name: string } | undefined>)[subscription.planId];
  return `${plan?.name ?? subscription.planId} retainer`;
}

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

export function paymentSourceHref(payment: {
  readonly project: { readonly id: string } | null;
}): string {
  return payment.project ? `/projects/${payment.project.id}#money` : "/maintenance";
}

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
