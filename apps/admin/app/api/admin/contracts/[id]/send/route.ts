import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { recordChange, userActor } from "@/lib/activity-log";
import { requireAdminSession } from "@/lib/require-admin";
import { sendTemplateMessage } from "@/lib/whatsapp-api";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { contractDraft, ensureLink } from "@/lib/email-templates";
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

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") === "email" ? "email" : "whatsapp";
    const edited = await readOptionalDraft(request);

    if (channel === "email") {
      try {
        const draft = contractDraft(contract.client.name, signUrl);
        const sent = await sendDocumentEmail({
          client: contract.client,
          subject: edited.subject?.trim() || draft.subject,
          body: ensureLink(edited.body?.trim() || draft.body, signUrl),
          relatedContractId: contract.id,
        });

        const updated = await prisma.contract.update({
          where: { id: contract.id },
          data: { status: "SENT" },
        });

        await recordChange({
          action: "contract.sent",
          actor: userActor(session),
          entityType: "contract",
          entityId: contract.id,
          entityLabel: contract.client.name || contract.client.company,
          summary: `Sent the contract to ${contract.client.email} by email`,
          before: { status: contract.status },
          after: { status: updated.status },
        });

        return NextResponse.json({ success: true, contract: updated, emailId: sent.id });
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
                : "Failed to send the contract by email.",
          },
          { status },
        );
      }
    }

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

      await recordChange({
        action: "contract.sent",
        actor: userActor(session),
        entityType: "contract",
        entityId: contract.id,
        entityLabel: contract.client.name || contract.client.company,
        summary: `Sent the contract to ${contract.client.name || contract.client.company || "the client"} for signing`,
        before: { status: contract.status },
        after: { status: updated.status },
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
