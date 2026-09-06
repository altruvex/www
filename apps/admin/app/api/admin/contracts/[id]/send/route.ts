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

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Contract not found" },
        { status: 404 },
      );
    }

    if (!contract.fileUrl) {
      return NextResponse.json(
        { success: false, message: "Contract has no generated file to send" },
        { status: 400 },
      );
    }

    if (!contract.signToken) {
      return NextResponse.json(
        { success: false, message: "Contract has no sign link configured" },
        { status: 400 },
      );
    }

    const signUrl = toAbsoluteUrl(`/sign/${contract.signToken}`, request);

    try {
      const result = await sendTemplateMessage({
        clientId: contract.clientId,
        phone: contract.client.phone,
        templateName: "contract_ready",
        bodyParams: [contract.client.name || "there", signUrl],
        relatedContractId: contract.id,
      });

      const updated = await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "SENT" },
      });

      return NextResponse.json({
        success: true,
        contract: updated,
        waMessageId: result.waMessageId,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error sending contract via WhatsApp:", error);
      }
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to send contract via WhatsApp",
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in contract send route:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to send contract" },
      { status: 500 },
    );
  }
}
