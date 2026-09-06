import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma, SubmissionStatus, Priority } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
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

    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching client:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to fetch client" },
      { status: 500 },
    );
  }
}

const updateClientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  status: z
    .enum([
      "NEW",
      "VIEWED",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL_SENT",
      "WON",
      "LOST",
      "SPAM",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateClientSchema.parse(body);

    const updateData: Prisma.ClientUpdateInput = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined)
      updateData.email = validatedData.email || null;
    if (validatedData.company !== undefined)
      updateData.company = validatedData.company;
    if (validatedData.industry !== undefined)
      updateData.industry = validatedData.industry;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status as SubmissionStatus;
    if (validatedData.priority !== undefined)
      updateData.priority = validatedData.priority as Priority;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error updating client:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update client" },
      { status: 500 },
    );
  }
}
