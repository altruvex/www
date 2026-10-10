"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@repo/database";

import { randomBytes } from "node:crypto";

import { getOperator } from "@/lib/authorize";
import { env } from "@/lib/env";
import { sendDocumentEmail } from "@/lib/email-sender";
import { ensureLink } from "@/lib/email-templates";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { sendTextMessage } from "@/lib/whatsapp-api";
import { can, type Action, type Subject } from "@/lib/rbac";
import { recordActivity, userActor } from "@/lib/activity-log";
import { getPricing } from "@/lib/pricing-store";
import { manualMetadata, manualRecordFields, channelPhrase } from "@/lib/manual-record";
import {
  billedAmountFor,
  canTransition,
  closureChecks,
  coveredByWarranty,
  formatHours,
  hourlyAmount,
  hoursToMinutes,
  quoteDraftFor,
  quoteExpiry,
  rateFor,
  type ChangeRequestStatusValue,
  type ClosureCheck,
} from "@/lib/change-requests";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

class Refusal extends Error {}

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; message: string };

async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, message: error.message };
    if (error instanceof z.ZodError) {
      return { ok: false, message: error.issues[0]?.message ?? "Some of that input is invalid." };
    }
    console.error("Change request action failed", error);
    return { ok: false, message: "The change could not be saved." };
  }
}

async function authorize(checks: [Action, Subject][]) {
  const operator = await getOperator();
  if (!operator) throw new Refusal("Not signed in.");
  for (const [action, subject] of checks) {
    if (!can(operator.role, action, subject)) throw new Refusal(`Not permitted: ${action} ${subject}`);
  }
  return { session: operator.session, role: operator.role };
}

const DELIVERY: [Action, Subject][] = [["edit", "project"]];
const PRICING: [Action, Subject][] = [
  ["edit", "project"],
  ["create", "payment"],
];

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/payments");
  revalidatePath("/invoices");
}

async function loadRequest(id: string) {
  const row = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          actualLaunchDate: true,
          ...PROJECT_CURRENCY_SELECT,
        },
      },
    },
  });
  if (!row) throw new Refusal("That change request no longer exists.");
  return row;
}

function assertMove(from: string, to: ChangeRequestStatusValue, pricing?: string | null) {
  if (!canTransition(from, to, pricing)) {
    throw new Refusal(
      `A ${from.toLowerCase().replace("_", " ")} request cannot move to ${to.toLowerCase().replace("_", " ")}.`,
    );
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Say what the client asked for.").max(200),
  detail: z.string().trim().max(4000).optional(),
});

export async function createChangeRequest(projectId: string, input: z.input<typeof createSchema>): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(DELIVERY);
    const data = createSchema.parse(input);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true },
    });
    if (!project) throw new Refusal("That project no longer exists.");
    if (project.status === "CANCELLED") {
      throw new Refusal("The project was cancelled. A change to work that never shipped is a new proposal.");
    }

    const row = await prisma.changeRequest.create({
      data: {
        projectId,
        title: data.title,
        detail: data.detail || null,
        createdBy: session?.user?.email ?? session?.user?.id ?? null,
      },
    });
    await recordActivity({
      action: "change_request.created",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: row.id,
      entityLabel: row.title,
      summary: `Logged a change request on ${project.name}`,
      metadata: { projectId },
    });
    revalidate(projectId);
    return { id: row.id };
  });
}

const quoteSchema = z.discriminatedUnion("pricing", [
  z.object({
    pricing: z.literal("HOURLY"),
    estimatedHours: z.number().positive("Estimate at least some time.").max(1000),
  }),
  z.object({
    pricing: z.literal("FIXED"),
    amount: z.number().int().min(0, "An amount cannot be negative."),
  }),
]);

export interface QuoteResult {
  quoteToken: string;
  pricing: "HOURLY" | "FIXED";
  estimatedMinutes: number | null;
  hourlyRate: number | null;
  quotedAmount: number;
}

export async function quoteChangeRequest(
  id: string,
  input: z.input<typeof quoteSchema>,
): Promise<ActionResult<QuoteResult>> {
  return attempt(async () => {
    const { session } = await authorize(PRICING);
    const data = quoteSchema.parse(input);
    const row = await loadRequest(id);
    assertMove(row.status, "QUOTED");

    const currency = projectCurrency(row.project);
    let update: {
      pricing: "HOURLY" | "FIXED";
      estimatedMinutes: number | null;
      hourlyRate: number | null;
      quotedAmount: number;
    };

    if (data.pricing === "HOURLY") {
      const { terms } = await getPricing();
      const rate = rateFor(currency, terms);
      if (rate == null) {
        throw new Refusal(`No hourly rate is published for ${currency}. Quote a fixed amount instead.`);
      }
      const minutes = hoursToMinutes(data.estimatedHours);
      update = {
        pricing: "HOURLY",
        estimatedMinutes: minutes,
        hourlyRate: rate,
        quotedAmount: hourlyAmount(minutes, rate),
      };
    } else {
      update = { pricing: "FIXED", estimatedMinutes: null, hourlyRate: null, quotedAmount: data.amount };
    }

    const quoteToken = row.quoteToken ?? randomBytes(24).toString("base64url");
    await prisma.changeRequest.update({
      where: { id },
      data: {
        ...update,
        status: "QUOTED",
        quotedAt: new Date(),
        quoteToken,
        quoteSentAt: null,
        quoteSentVia: null,
        quoteExpiresAt: null,
        quoteViewedAt: null,
      },
    });
    await recordActivity({
      action: row.status === "QUOTED" ? "change_request.requoted" : "change_request.quoted",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary:
        update.pricing === "HOURLY"
          ? `Quoted ${formatHours(update.estimatedMinutes)} at ${update.hourlyRate} ${currency}/h = ${update.quotedAmount} ${currency}`
          : `Quoted a fixed ${update.quotedAmount} ${currency}`,
      before: { pricing: row.pricing, quotedAmount: row.quotedAmount },
      after: { pricing: update.pricing, quotedAmount: update.quotedAmount },
      metadata: { projectId: row.projectId, currency },
    });
    revalidate(row.projectId);
    return { quoteToken, ...update };
  });
}

const sendSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  subject: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
});

export async function sendChangeRequestQuote(
  id: string,
  input: z.input<typeof sendSchema>,
): Promise<ActionResult<{ sentTo: string }>> {
  return attempt(async () => {
    const { session } = await authorize([
      ["edit", "project"],
      ["send", "message"],
    ]);
    const data = sendSchema.parse(input);

    const row = await prisma.changeRequest.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            client: { select: { id: true, name: true, company: true, email: true, phone: true } },
            ...PROJECT_CURRENCY_SELECT,
          },
        },
      },
    });
    if (!row) throw new Refusal("That change request no longer exists.");
    if (row.status !== "QUOTED" || row.quotedAmount == null || !row.quoteToken) {
      throw new Refusal("Only a quoted request can be sent. Quote it first.");
    }

    const { terms } = await getPricing();
    const client = row.project.client;
    const currency = projectCurrency(row.project);
    let base: string;
    try {
      base = publicBaseUrlFromHeaders(await headers());
    } catch {
      throw new Refusal("BETTER_AUTH_URL is not set, so no client link can be built.");
    }
    const link = `${base}/quote/${row.quoteToken}`;
    const now = new Date();
    const expiresAt = quoteExpiry(now, terms.proposalValidityDays);
    const draft = quoteDraftFor(row, client.name || client.company, currency, link, expiresAt);
    const body = ensureLink(data.body?.trim() || draft.body, link);

    let sentTo: string;
    try {
      if (data.channel === "email") {
        await sendDocumentEmail({ client, subject: data.subject?.trim() || draft.subject, body });
        sentTo = client.email ?? "the client";
      } else {
        if (!env?.WHATSAPP_ACCESS_TOKEN || !env?.WHATSAPP_PHONE_NUMBER_ID) {
          throw new Refusal("WhatsApp is not configured, so nothing can be sent over it.");
        }
        if (!client.phone) {
          throw new Refusal("This client has no phone number, so nothing can be sent over WhatsApp.");
        }
        await sendTextMessage({ clientId: client.id, phone: client.phone, body });
        sentTo = client.phone;
      }
    } catch (error) {
      if (error instanceof Refusal) throw error;
      throw new Refusal(error instanceof Error ? error.message : "The message could not be sent.");
    }

    await prisma.changeRequest.update({
      where: { id },
      data: { quoteSentAt: now, quoteSentVia: data.channel, quoteExpiresAt: expiresAt, quoteViewedAt: null },
    });
    await recordActivity({
      action: "change_request.quote_sent",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary: `Sent the ${row.quotedAmount} ${currency} quote to ${sentTo} by ${data.channel === "email" ? "email" : "WhatsApp"}`,
      metadata: { projectId: row.projectId, channel: data.channel, expiresAt: expiresAt.toISOString() },
    });
    revalidate(row.projectId);
    return { sentTo };
  });
}

export async function coverChangeRequestUnderWarranty(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(DELIVERY);
    const row = await loadRequest(id);
    assertMove(row.status, "APPROVED", "WARRANTY");

    const { terms } = await getPricing();
    if (!coveredByWarranty(row.requestedAt, row.project.actualLaunchDate, terms.postLaunchWarrantyDays)) {
      throw new Refusal(
        row.project.actualLaunchDate
          ? `This was requested outside the ${terms.postLaunchWarrantyDays}-day warranty. Quote it — a fixed quote of zero is the honest record of free work.`
          : "The project has no launch date, so no warranty has started.",
      );
    }

    const now = new Date();
    await prisma.changeRequest.update({
      where: { id },
      data: {
        pricing: "WARRANTY",
        status: "APPROVED",
        estimatedMinutes: null,
        hourlyRate: null,
        quotedAmount: 0,
        quotedAt: now,
        approvedAt: now,
      },
    });
    await recordActivity({
      action: "change_request.warranty",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary: "Covered under the post-launch warranty",
      metadata: { projectId: row.projectId, warrantyDays: terms.postLaunchWarrantyDays },
    });
    revalidate(row.projectId);
  });
}

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
  ...manualRecordFields,
});

export async function recordChangeRequestDecision(id: string, input: z.input<typeof decisionSchema>): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(DELIVERY);
    const data = decisionSchema.parse(input);
    const row = await loadRequest(id);
    assertMove(row.status, data.decision, row.pricing);
    if (data.decision === "APPROVED" && row.status !== "QUOTED") {
      throw new Refusal("Quote the request before recording the client's approval.");
    }

    const at = data.occurredAt ?? new Date();
    await prisma.changeRequest.update({
      where: { id },
      data:
        data.decision === "APPROVED"
          ? { status: "APPROVED", approvedAt: at }
          : { status: "DECLINED", closedAt: at },
    });
    await recordActivity({
      action: data.decision === "APPROVED" ? "change_request.approved" : "change_request.declined",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary: `Client ${data.decision === "APPROVED" ? "approved" : "declined"} the quote${channelPhrase(data.channel)}`,
      before: { status: row.status },
      after: { status: data.decision },
      metadata: {
        projectId: row.projectId,
        quotedAmount: row.quotedAmount,
        currency: projectCurrency(row.project),
        ...manualMetadata(data),
      },
    });
    revalidate(row.projectId);
  });
}

export async function startChangeRequest(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(DELIVERY);
    const row = await loadRequest(id);
    assertMove(row.status, "IN_PROGRESS");

    await prisma.changeRequest.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
    await recordActivity({
      action: "change_request.started",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary: "Work started",
      metadata: { projectId: row.projectId },
    });
    revalidate(row.projectId);
  });
}

const deliverSchema = z.object({
  actualHours: z.number().positive().max(1000).optional(),
});

export async function deliverChangeRequest(id: string, input: z.input<typeof deliverSchema> = {}): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(PRICING);
    const data = deliverSchema.parse(input);
    const row = await loadRequest(id);
    assertMove(row.status, "DELIVERED");

    const actualMinutes =
      data.actualHours != null ? hoursToMinutes(data.actualHours) : row.actualMinutes;
    const amount = billedAmountFor({ ...row, actualMinutes });
    const currency = projectCurrency(row.project);
    const now = new Date();

    const paymentId = await prisma.$transaction(async (tx) => {
      const payment =
        amount > 0
          ? await tx.payment.create({
              data: {
                projectId: row.projectId,
                milestone: "CHANGE_REQUEST",
                amount,
                status: "PENDING",
                dueDate: now,
                reference: `CR ${row.id.slice(0, 8)}`,
              },
            })
          : null;
      await tx.changeRequest.update({
        where: { id },
        data: {
          status: "DELIVERED",
          actualMinutes,
          billedAmount: amount,
          deliveredAt: now,
          closedAt: now,
          paymentId: payment?.id ?? null,
        },
      });
      return payment?.id ?? null;
    });

    await recordActivity({
      action: "change_request.delivered",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary:
        amount > 0
          ? `Delivered — ${amount} ${currency} now due`
          : `Delivered at no charge${row.pricing === "WARRANTY" ? " (warranty)" : ""}`,
      after: { status: "DELIVERED", billedAmount: amount, actualMinutes },
      metadata: { projectId: row.projectId, paymentId, currency, quotedAmount: row.quotedAmount },
    });
    revalidate(row.projectId);
  });
}

export async function cancelChangeRequest(id: string, note?: string): Promise<ActionResult> {
  return attempt(async () => {
    const { session } = await authorize(DELIVERY);
    const row = await loadRequest(id);
    assertMove(row.status, "CANCELLED");

    await prisma.changeRequest.update({
      where: { id },
      data: { status: "CANCELLED", closedAt: new Date() },
    });
    await recordActivity({
      action: "change_request.cancelled",
      actor: userActor(session),
      entityType: "changeRequest",
      entityId: id,
      entityLabel: row.title,
      summary: "Cancelled",
      before: { status: row.status },
      after: { status: "CANCELLED" },
      metadata: { projectId: row.projectId, ...(note?.trim() ? { note: note.trim().slice(0, 500) } : {}) },
    });
    revalidate(row.projectId);
  });
}

export interface ClosurePlan {
  checks: ClosureCheck[];
  blocked: boolean;
  canOverride: boolean;
  warrantyDays: number;
  actualLaunchDate: string | null;
}

export async function describeProjectClosure(projectId: string): Promise<ActionResult<ClosurePlan>> {
  return attempt(async () => {
    const { role } = await authorize([["edit", "project"]]);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        phase: true,
        status: true,
        actualLaunchDate: true,
        payments: { select: { status: true, amount: true } },
        changeRequests: { select: { status: true } },
      },
    });
    if (!project) throw new Refusal("That project no longer exists.");

    const checks = closureChecks(project);
    const { terms } = await getPricing();
    return {
      checks,
      blocked: checks.some((c) => !c.ok && c.blocks),
      canOverride: role === "OWNER",
      warrantyDays: terms.postLaunchWarrantyDays,
      actualLaunchDate: project.actualLaunchDate?.toISOString() ?? null,
    };
  });
}

const closeSchema = z.object({
  override: z.boolean().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function closeProject(projectId: string, input: z.input<typeof closeSchema> = {}): Promise<ActionResult> {
  return attempt(async () => {
    const { session, role } = await authorize([["edit", "project"]]);
    const data = closeSchema.parse(input);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        phase: true,
        status: true,
        actualLaunchDate: true,
        payments: { select: { status: true, amount: true } },
        changeRequests: { select: { status: true } },
      },
    });
    if (!project) throw new Refusal("That project no longer exists.");
    if (project.status === "COMPLETED") throw new Refusal("This project is already closed.");
    if (project.status === "CANCELLED") {
      throw new Refusal("A cancelled project is not finished work. Move it back to active first if it was.");
    }

    const failing = closureChecks(project).filter((c) => !c.ok && c.blocks);
    const override = data.override === true && role === "OWNER";
    if (failing.length > 0 && !override) {
      throw new Refusal(
        `${failing.map((c) => c.label).join("; ")}. ${role === "OWNER" ? "Confirm the override to close anyway." : "An owner can override this."}`,
      );
    }

    const now = new Date();
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED", completedAt: now },
    });
    await recordActivity({
      action: "project.completed",
      actor: userActor(session),
      entityType: "project",
      entityId: projectId,
      entityLabel: project.name,
      summary:
        failing.length > 0
          ? `Closed — owner override: ${failing.map((c) => c.label.toLowerCase()).join("; ")}`
          : "Closed",
      before: { status: project.status },
      after: { status: "COMPLETED", completedAt: now },
      metadata: {
        ...(failing.length > 0 ? { override: true, overridden: failing.map((c) => c.id) } : {}),
        ...(data.note ? { note: data.note } : {}),
      },
    });
    revalidate(projectId);
  });
}
