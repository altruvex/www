import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { recordActivity, userActor } from "@/lib/activity-log";
import { requireAdminSession } from "@/lib/require-admin";
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

// Only the fields the pipeline needs beyond the content document itself.
// Everything the deck renders lives in `content` and is validated by the
// shared schema, not duplicated here.
const createProposalSchema = z.object({
  clientId: z.string().uuid(),
  projectType: z.enum(["website", "webapp", "ecommerce", "pwa"]),
  complexity: z.enum(["basic", "standard", "premium"]),
  accentName: z.string().min(1),
  content: z.unknown(),
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

    // Server-side gate. The Admin form runs the same checks, but never
    // trust client-side validation alone.
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

    // The scalar columns are derived from the content document, never
    // entered separately — the contract builder and signing flow read them
    // and must not be able to disagree with the deck.
    // `totalPrice` is the NET figure — what the client owes after any
    // discount. Every downstream reader (contract value, VAT, milestone
    // payments, pipeline value, analytics) uses this column, and all of them
    // mean the amount actually invoiced. The pre-discount subtotal is
    // recoverable from `lineItems`, and the discount itself from `content`.
    const totalPrice = netTotal(content.investmentItems, content.discount);
    const timelineWeeks = totalTimelineWeeks(content.timelinePhases);
    // The published ceiling, enforced where the document is created rather
    // than trusted to the operator. The estimator that seeds this form already
    // clamps to it, but the phase durations are hand-editable afterwards — and
    // a proposal is the artefact a client holds us to. `/pricing` and
    // `/transparency` both promise this number; a deck that quoted past it
    // would be the one surface able to contradict them.
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
    // Carried alongside the items so a reader of `lineItems` alone cannot
    // mistake the subtotal for the fee.
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
      // The Proposal row still exists (status DRAFT, no fileUrl) — Ali can
      // retry generation rather than losing the edited content.
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

    await recordActivity({
      action: "proposal.created",
      actor: userActor(session),
      entityType: "proposal",
      entityId: proposal.id,
      entityLabel: client.name || client.company,
      summary: `Drafted a proposal for ${client.name || client.company || "a client"}`,
      after: { projectType: proposal.projectType, complexity: proposal.complexity, totalPrice: proposal.totalPrice },
      metadata: { clientId: client.id },
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
}
