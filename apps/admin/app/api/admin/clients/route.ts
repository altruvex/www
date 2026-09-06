import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma, SubmissionStatus, Priority, ClientSource, normalizePhone } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

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

    return NextResponse.json({
      success: true,
      clients,
      total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching clients:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}

const createClientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().optional(),
  industry: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = createClientSchema.parse(body);
    const phone = normalizePhone(validatedData.phone);
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Enter a valid phone number" },
        { status: 400 },
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

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creating client:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create client" },
      { status: 500 },
    );
  }
}
