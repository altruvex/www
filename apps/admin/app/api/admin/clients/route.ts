import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prisma,
  Prisma,
  SubmissionStatus,
  Priority,
  ClientSource,
  normalizePhone,
} from "@repo/database";
import { recordActivity } from "@/lib/activity-log";
import { badRequest, ok, readJson, withAdmin } from "@/lib/with-admin";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const where: Prisma.ClientWhereInput = {};

  if (status && status !== "all") {
    where.status = status as SubmissionStatus;
  }

  if (priority && priority !== "all") {
    where.priority = priority as Priority;
  }

  if (source && source !== "all") {
    where.source = source as ClientSource;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        contactSubmission: {
          select: { id: true, message: true, serviceInterest: true },
        },
        transparencyLead: {
          select: {
            projectType: true,
            complexity: true,
            timeline: true,
            priceMin: true,
            priceMax: true,
            weeksMin: true,
            weeksMax: true,
          },
        },
        proposals: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        contracts: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return ok({ clients, total, page, pageSize });
}, { can: ["view", "client"] });

const createClientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().optional(),
  industry: z.string().trim().optional(),
});

export const POST = withAdmin(async (request, { session, actor }) => {
  const validatedData = await readJson(request, createClientSchema);
  const phone = normalizePhone(validatedData.phone);
  if (!phone) throw badRequest("Enter a valid phone number");

  // Phone is how WhatsApp threads, website leads and the sign flow find a
  // client, so a second record on the same number splits that history in two.
  // The column is not unique (imported leads predate the rule), so the check
  // lives here and points the operator at the record that already exists.
  const existing = await prisma.client.findFirst({
    where: { phone },
    select: { id: true, name: true, company: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        message: `${existing.company || existing.name || "Another client"} already uses this phone number.`,
        existingId: existing.id,
      },
      { status: 409 },
    );
  }

  const client = await prisma.client.create({
    data: {
      name: validatedData.name,
      phone,
      email: validatedData.email || undefined,
      company: validatedData.company || undefined,
      industry: validatedData.industry || undefined,
      source: "MANUAL",
      addedBy: session.user.id,
    },
  });

  await recordActivity({
    action: "client.created",
    actor,
    entityType: "client",
    entityId: client.id,
    entityLabel: client.company || client.name,
    summary: `Added ${client.company || client.name || "a client"} manually`,
    metadata: { source: client.source },
  });

  return NextResponse.json({ success: true, client }, { status: 201 });
}, { can: ["create", "client"] });
