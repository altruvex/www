import { MAINTENANCE_PLAN_IDS, pricingCopy } from "@repo/pricing-schema";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";

import { Button } from "@repo/ui";

import { DeleteRecordButton } from "@/components/os/delete-record";
import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { MetaItem, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { intervalPriceLabel } from "@/lib/billing-interval";
import { date, money } from "@/lib/format";
import { getSubscription } from "@/lib/maintenance-admin";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { can } from "@/lib/rbac";

import { toSubscriptionView } from "../subscription-view";
import {
  RenewRetainer,
  RetainerActions,
  RetainerRequests,
  type PlanOption,
} from "./retainer-actions";

export const dynamic = "force-dynamic";

const FINANCE_ONLY = "Finance only";

export default async function RetainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/maintenance/[id]");
  if (denied) return denied;

  const { id } = await params;
  const [loaded, pricing, requestHeaders, role] = await Promise.all([
    getSubscription(id),
    getPricing(),
    headers(),
    currentRole(),
  ]);
  if (!loaded) notFound();
  const showMoney = canSeeFinance(role);
  const canEdit = can(role, "edit", "payment");
  const canDelete = can(role, "delete", "client");
  const sub = toSubscriptionView(loaded, pricing, showMoney);

  const copy = pricingCopy("en");
  const plans: PlanOption[] = MAINTENANCE_PLAN_IDS.map((planId) => {
    const price = intervalPriceLabel(
      pricing.maintenance[planId],
      sub.billingInterval,
    );
    return {
      id: planId,
      name: copy.maintenance[planId].name,
      quoteOnly: pricing.maintenance[planId].price === null,
      price: showMoney
        ? [price.price, price.suffix].filter(Boolean).join(" ")
        : null,
    };
  });
  const portalBase = publicBaseUrlFromHeaders(requestHeaders);

  const cap = sub.requestsPerCycle;
  const atCap = cap !== null && sub.requestsUsed >= cap;
  const periodPayment = sub.currentPeriodPayment;

  const renewDue =
    canEdit &&
    sub.status !== "CANCELLED" &&
    sub.invoiceAmount !== null &&
    (sub.renewalUrgency === "overdue" || sub.renewalUrgency === "due-soon");
  const unpaidPeriod =
    showMoney &&
    roleCanOpen(role, "/payments") &&
    (sub.effectiveStatus === "PAST_DUE" || sub.effectiveStatus === "GRACE")
      ? (sub.payments.find(
          (p) => p.status === "PENDING" || p.status === "OVERDUE",
        ) ?? null)
      : null;

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
          <StatusPill
            registry="subscriptionStatus"
            value={sub.effectiveStatus}
          />
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
            <MetaItem label={sub.autoRenew ? "Renews" : "Ends"}>
              {date(sub.currentPeriodEnd)}
            </MetaItem>
          </>
        }
        actions={
          <>
            {unpaidPeriod && (
              <Button asChild variant="outline">
                <Link href={`/payments?inspect=${unpaidPeriod.id}`}>
                  <Receipt className="size-3.5" aria-hidden />
                  Open the unpaid period
                </Link>
              </Button>
            )}
            {renewDue && (
              <RenewRetainer sub={sub} showMoney={showMoney} label="Renew" />
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="maintenanceSubscription"
                id={sub.id}
                label={`${sub.planName} · ${sub.clientName}`}
                redirectTo="/maintenance"
              />
            )}
          </>
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
                    value: showMoney
                      ? [sub.planPriceLabel, sub.planPriceSuffix]
                          .filter(Boolean)
                          .join(" ")
                      : FINANCE_ONLY,
                    hint: showMoney
                      ? "One invoice at the current interval"
                      : undefined,
                  },
                  {
                    label: "Quoted monthly",
                    value: sub.quoteOnly
                      ? showMoney
                        ? sub.quotedMonthlyPrice !== null
                          ? money(sub.quotedMonthlyPrice, sub.currency)
                          : "Not set"
                        : FINANCE_ONLY
                      : "Published price",
                  },
                  {
                    label: "Set status",
                    value:
                      sub.status.charAt(0) + sub.status.slice(1).toLowerCase(),
                    hint: "What an operator set; the pill above is what the calendar says",
                  },
                  { label: "Started", value: date(sub.startedAt) },
                  {
                    label: "Last renewed",
                    value: sub.lastRenewedAt
                      ? date(sub.lastRenewedAt)
                      : "Never",
                  },
                  ...(sub.trialEndsAt
                    ? [{ label: "Trial ends", value: date(sub.trialEndsAt) }]
                    : []),
                ]}
              />
            </Panel>
            <Panel title="Actions" flush>
              <RetainerActions
                sub={sub}
                plans={plans}
                portalBase={portalBase}
                showMoney={showMoney}
                canEdit={canEdit}
              />
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
                value: showMoney
                  ? sub.invoiceAmount !== null
                    ? money(sub.invoiceAmount, sub.currency)
                    : "No quote set — nothing can be invoiced"
                  : FINANCE_ONLY,
              },
              {
                label: "This period",
                value: periodPayment ? (
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    {showMoney ? (
                      <EntityLink type="payment" id={periodPayment.id}>
                        {money(periodPayment.amount, sub.currency)}
                      </EntityLink>
                    ) : (
                      <span>Invoice opened</span>
                    )}
                    <StatusPill
                      registry="paymentStatus"
                      value={periodPayment.status}
                    />
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
          <RetainerRequests sub={sub} canEdit={canEdit} />
        </Panel>

        <Panel
          title="Payments"
          description="Every period invoiced on this retainer, newest first"
          action={
            showMoney ? (
              <PanelLink href={`/payments?client=${sub.clientId}`}>
                All payments
              </PanelLink>
            ) : undefined
          }
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
                    {showMoney ? (
                      <EntityLink type="payment" id={payment.id}>
                        {money(payment.amount, sub.currency)}
                      </EntityLink>
                    ) : (
                      <span className="text-base">Period invoice</span>
                    )}
                    <p className="text-meta text-muted-foreground">
                      {payment.dueDate
                        ? `Due ${date(payment.dueDate)}`
                        : "No due date"}
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
