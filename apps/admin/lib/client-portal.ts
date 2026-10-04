import { prisma } from "@repo/database";
import {
  currentBillingCycle,
  daysUntilCycleEnd,
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type Locale,
  type MaintenancePlanId,
} from "@repo/pricing-schema";

import { billedPlanPrice, intervalPriceLabel } from "@/lib/billing-interval";
import { httpUrl } from "@/lib/http-url";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { getPricing } from "@/lib/pricing-store";
import { CONTACT } from "@/lib/proposal-content";
import { deriveStatus } from "@/lib/subscription-lifecycle";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

export interface PortalContact {
  readonly phone: string;
  readonly email: string;
}

export async function loadPortalContact(): Promise<PortalContact> {
  const row = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { phone: true, email: true },
  });
  return { phone: row?.phone ?? CONTACT.phone, email: row?.email ?? CONTACT.email };
}

export interface ProjectPortalPayment {
  readonly id: string;
  readonly milestone: string;
  readonly amount: number;
  readonly status: string;
  readonly dueDate: string | null;
  readonly paidAt: string | null;
}

export interface ProjectPortalView {
  readonly clientName: string;
  readonly projectName: string;
  readonly phase: string;
  readonly status: string;
  readonly stagingUrl: string | null;
  readonly liveUrl: string | null;
  readonly targetLaunchDate: string | null;
  readonly actualLaunchDate: string | null;
  readonly currency: string;
  readonly payments: readonly ProjectPortalPayment[];
  readonly paidTotal: number;
  readonly scheduleTotal: number;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  return httpUrl.safeParse(value).success ? value : null;
}

export async function loadProjectPortal(
  token: string,
  now: Date = new Date(),
): Promise<ProjectPortalView | null> {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    select: {
      name: true,
      phase: true,
      status: true,
      stagingUrl: true,
      liveUrl: true,
      targetLaunchDate: true,
      actualLaunchDate: true,
      client: { select: { name: true, company: true } },
      ...PROJECT_CURRENCY_SELECT,
      payments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          milestone: true,
          amount: true,
          status: true,
          dueDate: true,
          paidAt: true,
        },
      },
    },
  });
  if (!project) return null;

  const payments = project.payments.map((p) => ({
    id: p.id,
    milestone: p.milestone,
    amount: p.amount,
    status: p.status === "PENDING" && isPaymentOverdue(p, now) ? "OVERDUE" : p.status,
    dueDate: p.dueDate?.toISOString() ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
  }));
  const billable = payments.filter((p) => p.status !== "WAIVED");

  return {
    clientName: project.client.company || project.client.name || "Your project",
    projectName: project.name,
    phase: project.phase,
    status: project.status,
    stagingUrl: safeHttpUrl(project.stagingUrl),
    liveUrl: safeHttpUrl(project.liveUrl),
    targetLaunchDate: project.targetLaunchDate?.toISOString() ?? null,
    actualLaunchDate: project.actualLaunchDate?.toISOString() ?? null,
    currency: projectCurrency(project),
    payments,
    paidTotal: billable.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0),
    scheduleTotal: billable.reduce((s, p) => s + p.amount, 0),
  };
}

const REQUESTABLE: ReadonlySet<string> = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "GRACE"]);

export interface PortalRequest {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly countsToCap: boolean;
  readonly submittedAt: string;
  readonly completedAt: string | null;
}

export interface PortalView {
  readonly clientName: string;
  readonly planName: string;
  readonly planPriceLabel: string;
  readonly planPriceSuffix: string;
  readonly isCustomQuote: boolean;
  readonly subscriptionStatus: string;
  readonly canRequest: boolean;
  readonly renewsAt: string;
  readonly autoRenew: boolean;
  readonly requestsPerCycle: number | null;
  readonly requestsUsed: number;
  readonly requestsRemaining: number | null;
  readonly overageNote: string | null;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  readonly daysUntilAllowanceReset: number;
  readonly requestsThisCycle: readonly PortalRequest[];
  readonly history: readonly PortalRequest[];
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

function toPortalRequest(row: {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  countsToCap: boolean;
  createdAt: Date;
  completedAt: Date | null;
}): PortalRequest {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    status: row.status,
    countsToCap: row.countsToCap,
    submittedAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function loadPortal(
  token: string,
  locale: Locale = "en",
  now: Date = new Date(),
): Promise<PortalView | null> {
  const subscription = await prisma.maintenanceSubscription.findUnique({
    where: { portalToken: token },
    include: {
      client: { select: { name: true, company: true } },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!subscription || subscription.status === "CANCELLED") return null;
  if (!isPlanId(subscription.planId)) return null;

  const pricing = await getPricing();
  const plan = pricing.maintenance[subscription.planId];
  const copy = pricingCopy(locale);
  const tpl = copy.maintenanceTemplates;

  const cycle = currentBillingCycle(subscription.startedAt, now);
  const status = deriveStatus(subscription, now);

  const thisCycle = subscription.requests.filter(
    (r) =>
      r.cycleStart.getTime() >= cycle.start.getTime() &&
      r.cycleStart.getTime() < cycle.end.getTime(),
  );
  const used = thisCycle.filter((r) => r.countsToCap).length;

  const cap = plan.requestsPerCycle;
  const billed = billedPlanPrice(plan, subscription.quotedMonthlyPrice);
  const price = intervalPriceLabel(billed, subscription.billingInterval, locale);

  return {
    clientName:
      subscription.client.company || subscription.client.name || "Your account",
    planName: copy.maintenance[plan.id].name,
    planPriceLabel: price.price,
    planPriceSuffix: price.suffix,
    isCustomQuote: billed === null || billed.price === null,
    subscriptionStatus: status,
    canRequest: REQUESTABLE.has(status),
    renewsAt: subscription.currentPeriodEnd.toISOString(),
    autoRenew: subscription.autoRenew,
    requestsPerCycle: cap,
    requestsUsed: used,
    requestsRemaining: cap === null ? null : Math.max(cap - used, 0),
    overageNote:
      plan.overageHourlyRate === null
        ? null
        : tpl.overage.replace(
            "{rate}",
            new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
              plan.overageHourlyRate,
            ),
          ),
    cycleStart: cycle.start.toISOString(),
    cycleEnd: cycle.end.toISOString(),
    daysUntilAllowanceReset: daysUntilCycleEnd(cycle, now),
    requestsThisCycle: thisCycle.map(toPortalRequest),
    history: subscription.requests.map(toPortalRequest),
  };
}

export interface SubmitOutcome {
  readonly ok: boolean;
  readonly message: string;
  readonly overCap: boolean;
}

export async function submitRequest(
  token: string,
  title: string,
  detail: string | null,
  now: Date = new Date(),
): Promise<SubmitOutcome> {
  const subscription = await prisma.maintenanceSubscription.findUnique({
    where: { portalToken: token },
    include: { requests: true },
  });

  if (!subscription || !REQUESTABLE.has(deriveStatus(subscription, now))) {
    return {
      ok: false,
      message: "This portal link is not valid.",
      overCap: false,
    };
  }
  if (!isPlanId(subscription.planId)) {
    return { ok: false, message: "This plan is not recognised.", overCap: false };
  }

  const pricing = await getPricing();
  const cap = pricing.maintenance[subscription.planId].requestsPerCycle;
  const cycle = currentBillingCycle(subscription.startedAt, now);

  const usedThisCycle = subscription.requests.filter(
    (r) =>
      r.countsToCap &&
      r.cycleStart.getTime() >= cycle.start.getTime() &&
      r.cycleStart.getTime() < cycle.end.getTime(),
  ).length;

  const overCap = cap !== null && usedThisCycle >= cap;

  await prisma.maintenanceRequest.create({
    data: {
      subscriptionId: subscription.id,
      title,
      detail,
      cycleStart: cycle.start,
      countsToCap: !overCap,
    },
  });

  return {
    ok: true,
    overCap,
    message: overCap
      ? "Request received. This one is beyond your included allowance for this cycle, so it will be quoted as additional work before anything starts."
      : "Request received.",
  };
}
