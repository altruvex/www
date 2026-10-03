import { MAINTENANCE_PLAN_IDS, pricingCopy } from "@repo/pricing-schema";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { DeleteRecordButton } from "@/components/os/delete-record";
import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { MetaItem, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { intervalPriceLabel } from "@/lib/billing-interval";
import { date, money } from "@/lib/format";
import { getSubscription } from "@/lib/maintenance-admin";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";

import { RetainerActions, RetainerRequests, type PlanOption } from "./retainer-actions";

export const dynamic = "force-dynamic";

/**
 * One retainer: what the client is on, where its period stands, what it has
 * been invoiced, and every request sent through the portal.
 *
 * Status, period and urgency are derived by `getSubscription` from the row and
 * the clock, so this page is right with no sweep running. The controls that
 * commit the client to something live in the aside and confirm before they
 * send.
 */
export default async function RetainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sub, pricing, requestHeaders] = await Promise.all([
    getSubscription(id),
    getPricing(),
    headers(),
  ]);
  if (!sub) notFound();

  const copy = pricingCopy("en");
  // Each plan priced at THIS retainer's interval, against the override-aware
  // schema, so the plan dialog shows a figure without multiplying one here.
  const plans: PlanOption[] = MAINTENANCE_PLAN_IDS.map((planId) => {
    const price = intervalPriceLabel(pricing.maintenance[planId], sub.billingInterval);
    return {
      id: planId,
      name: copy.maintenance[planId].name,
      quoteOnly: pricing.maintenance[planId].price === null,
      price: [price.price, price.suffix].filter(Boolean).join(" "),
    };
  });
  const portalBase = publicBaseUrlFromHeaders(requestHeaders);

  const cap = sub.requestsPerCycle;
  const atCap = cap !== null && sub.requestsUsed >= cap;
  const periodPayment = sub.currentPeriodPayment;

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Maintenance", href: "/maintenance" },
          { label: sub.clientName, href: `/clients/${sub.clientId}` },
          { label: sub.planName },
        ]}
        title={`${sub.planName} retainer`}
        status={
          <StatusPill registry="subscriptionStatus" value={sub.effectiveStatus} />
        }
        meta={
          <>
            <MetaItem label="Client">
              <EntityLink type="client" id={sub.clientId}>
                {sub.clientName}
              </EntityLink>
            </MetaItem>
            <MetaItem label="Billing">
              {sub.billingIntervalLabel}
              {sub.billingIntervalPending && " from the next renewal"}
            </MetaItem>
            <MetaItem label={sub.autoRenew ? "Renews" : "Ends"}>{date(sub.currentPeriodEnd)}</MetaItem>
          </>
        }
        actions={
          <DeleteRecordButton
            entity="maintenanceSubscription"
            id={sub.id}
            label={`${sub.planName} · ${sub.clientName}`}
            redirectTo="/maintenance"
          />
        }
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Details" flush>
              <MetaList
                items={[
                  { label: "Plan", value: sub.planName },
                  {
                    label: "Price",
                    value: [sub.planPriceLabel, sub.planPriceSuffix].filter(Boolean).join(" "),
                    hint: "One invoice at the current interval",
                  },
                  {
                    label: "Quoted monthly",
                    value: sub.quoteOnly
                      ? sub.quotedMonthlyPrice !== null
                        ? money(sub.quotedMonthlyPrice, sub.currency)
                        : "Not set"
                      : "Published price",
                  },
                  { label: "Set status", value: sub.status.charAt(0) + sub.status.slice(1).toLowerCase(), hint: "What an operator set; the pill above is what the calendar says" },
                  { label: "Started", value: date(sub.startedAt) },
                  { label: "Last renewed", value: sub.lastRenewedAt ? date(sub.lastRenewedAt) : "Never" },
                  ...(sub.trialEndsAt ? [{ label: "Trial ends", value: date(sub.trialEndsAt) }] : []),
                ]}
              />
            </Panel>
            <Panel title="Actions" flush>
              <RetainerActions sub={sub} plans={plans} portalBase={portalBase} />
            </Panel>
          </>
        }
      >
        <Panel
          title="Current period"
          description={`${date(sub.currentPeriodStart)} → ${date(sub.currentPeriodEnd)}`}
          flush
        >
          <MetaList
            items={[
              {
                label: sub.autoRenew ? "Renewal" : "Ending",
                value:
                  sub.daysUntilRenewal < 0
                    ? `${-sub.daysUntilRenewal} day${sub.daysUntilRenewal === -1 ? "" : "s"} ago`
                    : sub.daysUntilRenewal === 0
                      ? "Today"
                      : `In ${sub.daysUntilRenewal} day${sub.daysUntilRenewal === 1 ? "" : "s"}`,
              },
              {
                label: "Next invoice",
                value:
                  sub.invoiceAmount !== null
                    ? money(sub.invoiceAmount, sub.currency)
                    : "No quote set — nothing can be invoiced",
              },
              {
                label: "This period",
                value: periodPayment ? (
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <EntityLink type="payment" id={periodPayment.id}>
                      {money(periodPayment.amount, sub.currency)}
                    </EntityLink>
                    <StatusPill registry="paymentStatus" value={periodPayment.status} />
                  </span>
                ) : (
                  "No invoice opened for this period"
                ),
                hint: periodPayment
                  ? undefined
                  : "Periods opened before renewals wrote payments have none; record it from the actions",
              },
            ]}
          />
        </Panel>

        <Panel
          title="Allowance"
          description={`Cycle ${date(sub.cycleStart)} → ${date(sub.cycleEnd)}`}
        >
          {cap === null ? (
            <p className="text-base text-muted-foreground">
              Quote-only plan — no published request allowance.
            </p>
          ) : (
            <p className="text-base">
              <span className={atCap ? "font-mono text-warning" : "font-mono"}>
                {sub.requestsUsed} of {cap}
              </span>{" "}
              <span className="text-muted-foreground">
                included requests used this cycle
                {atCap && " — further work bills as overage"}
              </span>
            </p>
          )}
        </Panel>

        <Panel
          title="Requests"
          description={`${sub.openRequests} open · ${sub.requests.length} in total`}
          flush
        >
          <RetainerRequests sub={sub} />
        </Panel>

        <Panel
          title="Payments"
          description="Every period invoiced on this retainer, newest first"
          action={<PanelLink href={`/payments?client=${sub.clientId}`}>All payments</PanelLink>}
          flush
        >
          {sub.payments.length === 0 ? (
            <p className="px-3 py-6 text-center text-base text-muted-foreground">
              No period has been invoiced on this retainer yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sub.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <EntityLink type="payment" id={payment.id}>
                      {money(payment.amount, sub.currency)}
                    </EntityLink>
                    <p className="text-meta text-muted-foreground">
                      {payment.dueDate ? `Due ${date(payment.dueDate)}` : "No due date"}
                      {payment.paidAt && ` · paid ${date(payment.paidAt)}`}
                    </p>
                  </div>
                  <StatusPill registry="paymentStatus" value={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <EntityAudit type="subscription" id={sub.id} />
      </DetailLayout>
    </div>
  );
}
