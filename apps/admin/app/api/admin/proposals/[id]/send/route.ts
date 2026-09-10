import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { recordChange, userActor } from "@/lib/activity-log";
import { requireAdminSession } from "@/lib/require-admin";
import { sendTemplateMessage } from "@/lib/whatsapp-api";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { ensureLink, proposalDraft } from "@/lib/email-templates";
import { readOptionalDraft } from "@/lib/read-draft";

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
    const session = await requireAdminSession(request);
    if (!session) {
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

    // Which channel, chosen by the operator. WhatsApp remains the default
    // because it is what the studio has always used; email exists because it
    // works today without a verified business, a registered number or a payment
    // method, and a proposal that cannot be sent is a deal that cannot move.
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") === "email" ? "email" : "whatsapp";
    const edited = await readOptionalDraft(request);

    if (channel === "email") {
      try {
        const link = toAbsoluteUrl(docUrl, request);
        const draft = proposalDraft(proposal.client.name, link);
        // An edited subject and body if the operator wrote one, the shared
        // default otherwise. The link is re-appended either way: the body is
        // editable, which means it is deletable, and a proposal email with no
        // proposal in it looks perfectly fine as it is sent.
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
          actor: userActor(session),
          entityType: "proposal",
          entityId: proposal.id,
          entityLabel: proposal.client.name || proposal.client.company,
          summary: `Sent the proposal to ${proposal.client.email} by email`,
          before: { status: proposal.status },
          after: { status: updated.status },
        });

        return NextResponse.json({ success: true, proposal: updated, emailId: sent.id });
      } catch (error) {
        // Each of these is a different fix, and flattening them into "sending
        // failed" makes the operator guess which one they are looking at.
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
        actor: userActor(session),
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
}
