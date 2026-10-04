import { RETAINER_CURRENCY } from "@/lib/payment-source";
import { projectCurrency } from "@/lib/project-currency";

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
    readonly currency: string | null;
    readonly contract: { readonly proposal: { readonly currency: string } } | null;
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
        currency: projectCurrency(p),
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

export function paymentProgress(payments: readonly { amount: number; status: string }[]) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  return { total, collected };
}
