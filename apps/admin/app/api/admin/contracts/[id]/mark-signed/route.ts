import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";
import { handleContractSigned } from "@/lib/contract-signing";

const markSignedSchema = z.object({
  signedByName: z.string().trim().min(1),
});

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

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Contract not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { signedByName } = markSignedSchema.parse(body);

    // Same trigger as the public click-to-sign page (§6): creates the
    // Project + 50/30/20 Payments and fires the onboarding message, exactly
    // once, regardless of which path marked the contract signed.
    const { contract: updated } = await handleContractSigned({
      contractId: contract.id,
      signedByName,
      signedIp: null,
      signatureMethod: "UPLOADED_PDF",
      baseUrl: process.env.BETTER_AUTH_URL || request.nextUrl.origin,
    });

    return NextResponse.json({ success: true, contract: updated });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error marking contract as signed:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Enter the signer's name" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to mark contract as signed" },
      { status: 500 },
    );
  }
}
