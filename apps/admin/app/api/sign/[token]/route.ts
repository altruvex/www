import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { handleContractSigned } from "@/lib/contract-signing";
import {
  discountAmount,
  investmentTotal,
  proposalContentSchema,
} from "@/lib/proposal-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const contract = await prisma.contract.findUnique({
      where: { signToken: token },
      include: { client: true, proposal: true, project: true },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Contract not found" },
        { status: 404 },
      );
    }

    // A signer should see what they are getting off, not only the net figure —
    // the discount is part of what they agreed to. Derived here rather than
    // stored so it can never contradict the proposal it came from.
    const parsedContent = proposalContentSchema.safeParse(contract.proposal.content);
    const reduction = parsedContent.success
      ? discountAmount(parsedContent.data.investmentItems, parsedContent.data.discount)
      : 0;

    return NextResponse.json({
      success: true,
      contract: {
        status: contract.status,
        fileUrl: contract.fileUrl,
        signedAt: contract.signedAt,
        signedByName: contract.signedByName,
        client: {
          name: contract.client.name,
          company: contract.client.company,
        },
        proposal: {
          projectType: contract.proposal.projectType,
          complexity: contract.proposal.complexity,
          currency: contract.proposal.currency,
          totalPrice: contract.proposal.totalPrice,
          lineItems: contract.proposal.lineItems,
          timelineWeeks: contract.proposal.timelineWeeks,
          paymentSplit: contract.proposal.paymentSplit,
          discount:
            reduction > 0 && parsedContent.success
              ? {
                  label: parsedContent.data.discount.label.trim() || "Discount",
                  amount: reduction,
                  subtotal: investmentTotal(parsedContent.data.investmentItems),
                }
              : null,
        },
        portalToken: contract.project?.portalToken ?? null,
      },
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching contract for signing:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to load contract" },
      { status: 500 },
    );
  }
}

const signSchema = z.object({
  signedByName: z.string().trim().min(1),
  agreed: z.literal(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const contract = await prisma.contract.findUnique({
      where: { signToken: token },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Contract not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validatedData = signSchema.parse(body);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const { project } = await handleContractSigned({
      contractId: contract.id,
      signedByName: validatedData.signedByName,
      signedIp: ip,
      signatureMethod: "CLICK_TO_SIGN",
      baseUrl: process.env.BETTER_AUTH_URL || request.nextUrl.origin,
    });

    return NextResponse.json({
      success: true,
      portalToken: project.portalToken,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error signing contract:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Please enter your name and confirm agreement" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to sign contract" },
      { status: 500 },
    );
  }
}
