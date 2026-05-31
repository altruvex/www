import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma, SubmissionStatus, Priority } from "@repo/database";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthed(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const where: Prisma.ContactSubmissionWhereInput = {};

    if (status && status !== "all") {
      where.status = status as SubmissionStatus;
    }

    if (priority && priority !== "all") {
      where.priority = priority as Priority;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              notes: true,
              meetings: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      submissions,
      total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching contacts:", error);
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch contacts",
      },
      { status: 500 },
    );
  }
}

const updateContactSchema = z.object({
  id: z.string().uuid(),
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
  assignedToId: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminAuthed(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = updateContactSchema.parse(body);

    const updateData: Prisma.ContactSubmissionUpdateInput = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;

      if (validatedData.status === "VIEWED") {
        const existing = await prisma.contactSubmission.findUnique({
          where: { id: validatedData.id },
          select: { firstViewedAt: true },
        });
        if (!existing?.firstViewedAt) {
          updateData.firstViewedAt = new Date();
        }
      }

      if (validatedData.status === "CONTACTED") {
        const existing = await prisma.contactSubmission.findUnique({
          where: { id: validatedData.id },
          select: { firstContactedAt: true },
        });
        if (!existing?.firstContactedAt) {
          updateData.firstContactedAt = new Date();
        }
      }
    }

    if (validatedData.priority) {
      updateData.priority = validatedData.priority;
    }

    if (validatedData.assignedToId !== undefined) {
      if (validatedData.assignedToId === null) {
        updateData.assignedTo = { disconnect: true };
      } else {
        updateData.assignedTo = { connect: { id: validatedData.assignedToId } };
      }
    }

    const updated = await prisma.contactSubmission.update({
      where: { id: validatedData.id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      submission: updated,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error updating contact:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update contact",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthed(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact ID is required",
        },
        { status: 400 },
      );
    }

    const contact = await prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact not found",
        },
        { status: 404 },
      );
    }

    await prisma.contactSubmission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error deleting contact:", error);
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete contact",
      },
      { status: 500 },
    );
  }
}
