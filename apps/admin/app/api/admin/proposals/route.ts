import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { recordActivity } from "@/lib/activity-log";
import { withAdmin } from "@/lib/with-admin";
import { buildProposalPptx, totalTimelineWeeks } from "@/lib/proposal-builder";
import { convertPptxToPdf } from "@/lib/pptx-to-pdf";
import { upload } from "@/lib/storage";
import { getIntentAccent } from "@/lib/intent-accent";
import { getCompanySettings } from "@/lib/company-settings";
import { ProposalQaError, runProposalContentGate } from "@/lib/proposal-qa";
import {
  discountAmount,
  netTotal,
  validUntilDate,
} from "@/lib/proposal-schema";
import { MAX_DELIVERY_WEEKS } from "@repo/pricing-schema";

export const GET = withAdmin(async (request) => {
  try {
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
}, { can: ["view", "proposal"] });

const createProposalSchema = z.object({
  clientId: z.string().uuid(),
  projectType: z.enum(["website", "webapp", "ecommerce", "pwa"]),
  complexity: z.enum(["basic", "standard", "premium"]),
  accentName: z.string().min(1),
  content: z.unknown(),
  sourceProposalId: z.string().uuid().optional(),
});

export const POST = withAdmin(async (request, { session, actor }) => {
  try {
    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    let content;
    try {
      content = runProposalContentGate(validatedData.content);
    } catch (error) {
      if (error instanceof ProposalQaError) {
        return NextResponse.json(
          { success: false, message: error.message, issues: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }

    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    });
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const totalPrice = netTotal(content.investmentItems, content.discount);
    const timelineWeeks = totalTimelineWeeks(content.timelinePhases);
    if (timelineWeeks > MAX_DELIVERY_WEEKS) {
      return NextResponse.json(
        {
          success: false,
          message: `Timeline is ${timelineWeeks} weeks. Published delivery ceiling is ${MAX_DELIVERY_WEEKS} weeks — split the scope into phases instead.`,
        },
        { status: 400 },
      );
    }
    const lineItems = content.investmentItems.map((item) => ({
      name: item.item,
      amount: item.amount,
    }));
    const reduction = discountAmount(content.investmentItems, content.discount);
    if (reduction > 0) {
      lineItems.push({
        name: content.discount.label.trim() || "Discount",
        amount: -reduction,
      });
    }
    const [first, second, final] = content.paymentSchedule;
    const paymentSplit = {
      first: first?.percent ?? 0,
      second: second?.percent ?? 0,
      final: final?.percent ?? 0,
    };
    const intent = getIntentAccent(validatedData.accentName);

    const proposal = await prisma.proposal.create({
      data: {
        clientId: validatedData.clientId,
        projectType: validatedData.projectType,
        complexity: validatedData.complexity,
        currency: content.meta.currency,
        totalPrice,
        lineItems,
        timelineWeeks,
        paymentSplit,
        colorWorld: intent.world,
        accentName: validatedData.accentName,
        content,
        validUntil: validUntilDate(content.meta),
        createdBy: session.user.id,
      },
    });

    const source = validatedData.sourceProposalId
      ? await prisma.proposal.findFirst({
          where: { id: validatedData.sourceProposalId, clientId: client.id },
          select: { id: true },
        })
      : null;
    await recordActivity({
      action: "proposal.created",
      actor,
      entityType: "proposal",
      entityId: proposal.id,
      entityLabel: client.name || client.company,
      summary: source
        ? `Drafted a new version of a proposal for ${client.name || client.company || "a client"}`
        : `Drafted a proposal for ${client.name || client.company || "a client"}`,
      after: { projectType: proposal.projectType, complexity: proposal.complexity, totalPrice: proposal.totalPrice },
      metadata: source ? { clientId: client.id, sourceProposalId: source.id } : { clientId: client.id },
    });

    let fileUrl: string | null = null;
    let pdfUrl: string | null = null;

    try {
      const company = await getCompanySettings();
      const pptxBuffer = await buildProposalPptx(content, company);
      fileUrl = await upload(
        pptxBuffer,
        `proposals/${proposal.id}.pptx`,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );

      const pdfBuffer = await convertPptxToPdf(pptxBuffer);
      if (pdfBuffer) {
        pdfUrl = await upload(
          pdfBuffer,
          `proposals/${proposal.id}.pdf`,
          "application/pdf",
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error generating proposal file:", error);
      }
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof ProposalQaError
              ? error.message
              : "Proposal was saved but the document failed to generate.",
          issues: error instanceof ProposalQaError ? error.issues : undefined,
          proposal,
        },
        { status: 502 },
      );
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { fileUrl, pdfUrl },
    });

    return NextResponse.json(
      { success: true, proposal: updated },
      { status: 201 },
    );
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
}, { can: ["create", "proposal"] });
