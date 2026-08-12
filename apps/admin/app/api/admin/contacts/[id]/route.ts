import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
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

    const submission = await prisma.contactSubmission.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        tags: {
          orderBy: {
            createdAt: "desc",
          },
        },
        meetings: {
          orderBy: {
            scheduledDate: "asc",
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact submission not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching contact:", error);
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch contact",
      },
      { status: 500 },
    );
  }
}
