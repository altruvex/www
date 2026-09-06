import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";
import { sendTemplateMessage } from "@/lib/whatsapp-api";

function toAbsoluteUrl(url: string, request: NextRequest): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = process.env.BETTER_AUTH_URL || request.nextUrl.origin;
  return `${base.replace(/\/$/, "")}${url}`;
}

export async function POST(
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

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, message: "Proposal not found" },
        { status: 404 },
      );
    }

    const docUrl = proposal.pdfUrl ?? proposal.fileUrl;
    if (!docUrl) {
      return NextResponse.json(
        { success: false, message: "Proposal has no generated file to send" },
        { status: 400 },
      );
    }

    try {
      const result = await sendTemplateMessage({
        clientId: proposal.clientId,
        phone: proposal.client.phone,
        templateName: "proposal_ready",
        bodyParams: [
          proposal.client.name || "there",
          toAbsoluteUrl(docUrl, request),
        ],
        relatedProposalId: proposal.id,
      });

      const updated = await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          whatsappMessageId: result.waMessageId,
        },
      });

      return NextResponse.json({ success: true, proposal: updated });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error sending proposal via WhatsApp:", error);
      }
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to send proposal via WhatsApp",
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in proposal send route:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to send proposal" },
      { status: 500 },
    );
  }
}
