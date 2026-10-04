import { recordChange } from "@/lib/activity-log";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { ensureLink, proposalDraft } from "@/lib/email-templates";
import { toAbsoluteUrl } from "@/lib/public-url";
import { readOptionalDraft } from "@/lib/read-draft";
import { withAdmin } from "@/lib/with-admin";
import { SHARED_URL_TTL_SECONDS, documentUrl } from "@/lib/storage";
import { sendTemplateMessage } from "@/lib/whatsapp-api";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";

export const POST = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  try {
    const { id } = params;

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

    if (proposal.status !== "DRAFT" && proposal.status !== "SENT") {
      return NextResponse.json(
        {
          success: false,
          message: `This proposal is ${proposal.status.toLowerCase()} and can no longer be sent. Issue a new version instead.`,
        },
        { status: 409 },
      );
    }

    const docUrl = await documentUrl(proposal.pdfUrl ?? proposal.fileUrl, SHARED_URL_TTL_SECONDS);
    if (!docUrl) {
      return NextResponse.json(
        { success: false, message: "Proposal has no generated file to send" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") === "email" ? "email" : "whatsapp";
    const edited = await readOptionalDraft(request);

    if (channel === "email") {
      try {
        const link = toAbsoluteUrl(docUrl, request);
        const draft = proposalDraft(proposal.client.name, link);
        const sent = await sendDocumentEmail({
          client: proposal.client,
          subject: edited.subject?.trim() || draft.subject,
          body: ensureLink(edited.body?.trim() || draft.body, link),
          relatedProposalId: proposal.id,
        });

        const updated = await prisma.proposal.update({
          where: { id: proposal.id },
          data: { status: "SENT", sentAt: new Date() },
        });

        await recordChange({
          action: "proposal.sent",
          actor,
          entityType: "proposal",
          entityId: proposal.id,
          entityLabel: proposal.client.name || proposal.client.company,
          summary: `Sent the proposal to ${proposal.client.email} by email`,
          before: { status: proposal.status },
          after: { status: updated.status },
        });

        return NextResponse.json({ success: true, proposal: updated, emailId: sent.id });
      } catch (error) {
        const status =
          error instanceof ClientHasNoAddressError
            ? 400
            : error instanceof EmailNotConfiguredError
              ? 503
              : 502;
        return NextResponse.json(
          {
            success: false,
            message:
              error instanceof EmailSendError ||
              error instanceof ClientHasNoAddressError ||
              error instanceof EmailNotConfiguredError
                ? error.message
                : "Failed to send the proposal by email.",
          },
          { status },
        );
      }
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

      await recordChange({
        action: "proposal.sent",
        actor,
        entityType: "proposal",
        entityId: proposal.id,
        entityLabel: proposal.client.name || proposal.client.company,
        summary: `Sent the proposal to ${proposal.client.name || proposal.client.company || "the client"} via WhatsApp`,
        before: { status: proposal.status },
        after: { status: updated.status },
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
}, { can: ["send", "proposal"] });
