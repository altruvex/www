import { RETAINER_CURRENCY } from "@/lib/payment-source";

/**
 * Every payment a client owes or has paid, read once from each ledger it has.
 *
 * A project's payments come through its contract and carry that contract's
 * currency; a retainer's periods (`Payment.subscriptionId`) come through the
 * client's subscriptions and are published in EGP. A payment belongs to
 * exactly one of the two, so flattening both sides never counts a row twice —
 * that is the only place the client page is allowed to read payments from.
 */

interface ClientPaymentRow {
  readonly id: string;
  readonly milestone: string;
  readonly amount: number;
  readonly status: string;
  readonly paidAt: Date | null;
  readonly dueDate: Date | null;
}

export interface ClientPaymentSources {
  readonly projects: readonly {
    readonly id: string;
    readonly payments: readonly ClientPaymentRow[];
    readonly contract: { readonly proposal: { readonly currency: string } };
  }[];
  readonly subscriptions: readonly {
    readonly id: string;
    readonly planId: string;
    readonly payments: readonly ClientPaymentRow[];
  }[];
}

export type ClientPayment = ClientPaymentRow & {
  readonly projectId: string | null;
  readonly subscription: { readonly planId: string } | null;
  readonly currency: string;
};

export function clientPayments(client: ClientPaymentSources): ClientPayment[] {
  return [
    ...client.projects.flatMap((p) =>
      p.payments.map((pay) => ({
        ...pay,
        projectId: p.id,
        subscription: null,
        currency: p.contract.proposal.currency,
      })),
    ),
    ...client.subscriptions.flatMap((sub) =>
      sub.payments.map((pay) => ({
        ...pay,
        projectId: null,
        subscription: { planId: sub.planId },
        currency: RETAINER_CURRENCY,
      })),
    ),
  ];
}

/** What a set of payments has collected against what it asks for, in one currency. */
export function paymentProgress(payments: readonly { amount: number; status: string }[]) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  return { total, collected };
}
