import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const project = await prisma.project.findUnique({
      where: { portalToken: token },
      include: {
        client: { select: { name: true, company: true, phone: true } },
        payments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        name: project.name,
        phase: project.phase,
        status: project.status,
        stagingUrl: project.stagingUrl,
        liveUrl: project.liveUrl,
        targetLaunchDate: project.targetLaunchDate,
        client: project.client,
        payments: project.payments.map((payment) => ({
          milestone: payment.milestone,
          amount: payment.amount,
          status: payment.status,
          dueDate: payment.dueDate,
          paidAt: payment.paidAt,
        })),
      },
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching portal project:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to load project" },
      { status: 500 },
    );
  }
}
