import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders, enforceRateLimit, prisma } from "@repo/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Public by design — the caller holds only the link — so the read is
    // limited per IP and per token, the same shape the client portal and the
    // sign link already use. Without it the one endpoint that returns a
    // client's payment schedule answers as fast as anyone can ask.
    for (const [route, identifier, limit] of [
      ["portal_read_ip", clientIpFromHeaders(request.headers), 60],
      ["portal_read_token", token, 120],
    ] as const) {
      const rl = await enforceRateLimit({
        scope: "public_api",
        route,
        identifier,
        limit,
        windowSeconds: 60,
      });
      if (!rl.ok) {
        return NextResponse.json(
          { success: false, message: "Too many requests. Please try again shortly." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
        );
      }
    }

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
