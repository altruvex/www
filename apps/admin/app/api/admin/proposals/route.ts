import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";
import { buildProposalPptx } from "@/lib/proposal-builder";
import { convertPptxToPdf } from "@/lib/pptx-to-pdf";
import { upload } from "@/lib/storage";
import { getIntentAccent } from "@/lib/intent-accent";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const proposals = await prisma.proposal.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, proposals });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching proposals:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to fetch proposals" },
      { status: 500 },
    );
  }
}

const lineItemSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().int().nonnegative(),
});

const createProposalSchema = z.object({
  clientId: z.string().uuid(),
  projectType: z.enum(["website", "webapp", "ecommerce", "pwa"]),
  complexity: z.enum(["basic", "standard", "premium"]),
  timelineWeeks: z.number().int().positive(),
  currency: z.enum(["EGP", "USD"]).default("EGP"),
  lineItems: z.array(lineItemSchema).min(1),
  accentName: z.string().min(1),
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
    const validatedData = createProposalSchema.parse(body);

    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    });
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const totalPrice = validatedData.lineItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const intent = getIntentAccent(validatedData.accentName);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const proposal = await prisma.proposal.create({
      data: {
        clientId: validatedData.clientId,
        projectType: validatedData.projectType,
        complexity: validatedData.complexity,
        currency: validatedData.currency,
        totalPrice,
        lineItems: validatedData.lineItems,
        timelineWeeks: validatedData.timelineWeeks,
        colorWorld: intent.world,
        accentName: validatedData.accentName,
        validUntil,
        createdBy: session.user.id,
      },
    });

    const proposalWithClient = { ...proposal, client };

    let fileUrl: string | null = null;
    let pdfUrl: string | null = null;

    try {
      const pptxBuffer = await buildProposalPptx(proposalWithClient);
      fileUrl = await upload(
        pptxBuffer,
        `proposals/${proposal.id}.pptx`,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );

      const pdfBuffer = await convertPptxToPdf(pptxBuffer);
      if (pdfBuffer) {
        pdfUrl = await upload(pdfBuffer, `proposals/${proposal.id}.pdf`, "application/pdf");
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error generating proposal file:", error);
      }
      // The Proposal row still exists (status DRAFT, no fileUrl) — Ali can
      // retry generation rather than losing the priced line items.
      return NextResponse.json(
        {
          success: false,
          message: "Proposal was priced but the document failed to generate.",
          proposal,
        },
        { status: 502 },
      );
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { fileUrl, pdfUrl },
    });

    return NextResponse.json({ success: true, proposal: updated }, { status: 201 });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creating proposal:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create proposal" },
      { status: 500 },
    );
  }
}
