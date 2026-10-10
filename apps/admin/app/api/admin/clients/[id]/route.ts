import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prisma,
  Prisma,
  SubmissionStatus,
  Priority,
  canonicalPhone,
  phoneMatchKeys,
} from "@repo/database";
import { recordChange } from "@/lib/activity-log";
import { startOfBusinessDay } from "@/lib/payment-overdue";
import { httpUrl } from "@/lib/http-url";
import {
  CLIENT_STATUSES,
  derivedStatusMessage,
  LOST_REASON_VALUES,
  WRITABLE_STATUSES,
} from "@/lib/status";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import {
  clearFollowUpAlerts,
  closesFollowUp,
} from "@/app/(dashboard)/clients/[id]/follow-up-alerts";

export const GET = withAdmin<{ id: string }>(async (_request, { params }) => {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      contactSubmission: {
        include: {
          notes: {
            include: {
              createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          tags: { orderBy: { createdAt: "desc" } },
          meetings: { orderBy: { scheduledDate: "asc" } },
        },
      },
      transparencyLead: true,
      proposals: { orderBy: { createdAt: "desc" } },
      contracts: { orderBy: { createdAt: "desc" } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: { payments: { orderBy: { createdAt: "asc" } } },
      },
      messages: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) throw notFound("Client not found");

  return ok({ client });
}, { can: ["view", "client"] });

const optionalText = (max: number) => z.string().trim().max(max).optional();

const updateClientSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.email().optional().or(z.literal("")),
  company: optionalText(200),
  industry: optionalText(120),
  website: httpUrl.optional().or(z.literal("")),
  country: optionalText(120),
  address: optionalText(500),
  billingEmail: z.email().optional().or(z.literal("")),
  taxId: optionalText(80),
  status: z.enum(CLIENT_STATUSES).optional(),
  // Required with status LOST: why the lead was lost.
  lostReason: z.enum(LOST_REASON_VALUES).optional(),
  lostNote: optionalText(1000),
  // Required with a move to NURTURE (docs/sales-os.md R8): why it is parked and
  // the "YYYY-MM-DD" review date, stored as the next action.
  nurtureReason: z.enum(LOST_REASON_VALUES).optional(),
  nextActionAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

type UpdateInput = z.infer<typeof updateClientSchema>;

const NULLABLE_TEXT = [
  "email",
  "company",
  "industry",
  "website",
  "country",
  "address",
  "billingEmail",
  "taxId",
] as const;

export const PATCH = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input: UpdateInput = await readJson(request, updateClientSchema);
  const { id } = params;
  if (input.status !== undefined && !WRITABLE_STATUSES.has(input.status)) {
    throw conflict(derivedStatusMessage(input.status));
  }
  if (input.status === "LOST" && !input.lostReason) {
    throw conflict("Pick a reason before marking this lost (lostReason).");
  }
  if (input.lostReason && input.status !== "LOST") {
    throw badRequest("lostReason is only accepted together with status LOST.");
  }
  if ((input.nurtureReason || input.nextActionAt) && input.status !== "NURTURE") {
    throw badRequest("nurtureReason and nextActionAt are only accepted together with status NURTURE.");
  }
  const reviewAt = input.nextActionAt ? new Date(`${input.nextActionAt}T00:00:00`) : null;
  if (reviewAt && Number.isNaN(reviewAt.getTime())) throw badRequest("Pick a valid review date.");
  if (reviewAt && startOfBusinessDay(reviewAt).getTime() < startOfBusinessDay(new Date()).getTime()) {
    throw badRequest("The nurture review date must be today or later.");
  }

  const before = await prisma.client.findUnique({
    where: { id },
    select: {
      name: true,
      phone: true,
      email: true,
      company: true,
      industry: true,
      website: true,
      country: true,
      address: true,
      billingEmail: true,
      taxId: true,
      status: true,
      priority: true,
      lostReason: true,
      lostNote: true,
      nurtureReason: true,
      nextActionAt: true,
      nextActionNote: true,
    },
  });
  if (!before) throw notFound("Client not found");
  // R8: entering NURTURE needs both; a lead already parked keeps its own.
  if (
    input.status === "NURTURE" &&
    before.status !== "NURTURE" &&
    (!input.nurtureReason || !reviewAt)
  ) {
    throw badRequest("Moving to nurture needs nurtureReason and a review date (nextActionAt).");
  }

  const updateData: Prisma.ClientUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.phone !== undefined) {
    const phone = canonicalPhone(input.phone);
    if (!phone) throw badRequest("Enter a valid phone number");
    if (phone !== before.phone) {
      const clash = await prisma.client.findFirst({
        where: { phone: { in: phoneMatchKeys(input.phone) }, id: { not: id } },
        select: { id: true, name: true, company: true },
      });
      if (clash) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            message: `${clash.company || clash.name || "Another client"} already uses this phone number.`,
            existingId: clash.id,
          },
          { status: 409 },
        );
      }
    }
    updateData.phone = phone;
  }
  for (const key of NULLABLE_TEXT) {
    const value = input[key];
    if (value !== undefined) updateData[key] = value || null;
  }
  if (input.status !== undefined) updateData.status = input.status as SubmissionStatus;
  if (input.status === "LOST" && input.lostReason) {
    updateData.lostReason = input.lostReason;
    updateData.lostNote = input.lostNote || null;
  } else if (input.status !== undefined) {
    // Leaving (or never in) LOST: a stale reason must not follow the lead.
    updateData.lostReason = null;
    updateData.lostNote = null;
  }
  if (input.status === "NURTURE" && input.nurtureReason && reviewAt) {
    updateData.nurtureReason = input.nurtureReason;
    updateData.nextActionAt = reviewAt;
    updateData.nextActionNote = "Review nurture";
  } else if (input.status !== undefined && input.status !== "NURTURE") {
    // Leaving (or never in) NURTURE: no nurture reason follows the lead.
    updateData.nurtureReason = null;
  }
  if (input.priority !== undefined) updateData.priority = input.priority as Priority;

  const client = await prisma.client.update({ where: { id }, data: updateData });
  if ((input.status !== before.status && closesFollowUp(input.status)) || reviewAt) {
    await clearFollowUpAlerts(id, "clients.patch");
  }

  const keys = Object.keys(updateData) as (keyof typeof before)[];
  await recordChange({
    action: "client.updated",
    actor,
    entityType: "client",
    entityId: id,
    entityLabel: client.company || client.name,
    summary: `Updated ${client.company || client.name || "client"}`,
    before: Object.fromEntries(keys.map((k) => [k, before[k]])),
    after: Object.fromEntries(keys.map((k) => [k, client[k]])),
  });

  return ok({ client });
}, { can: ["edit", "client"] });
