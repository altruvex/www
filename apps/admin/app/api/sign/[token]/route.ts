import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { publicBaseUrl } from "@/lib/public-url";
import { SHARED_URL_TTL_SECONDS, documentUrl } from "@/lib/storage";
import { clientIpFromHeaders, enforceRateLimit, prisma } from "@repo/database";
import { handleContractSigned } from "@/lib/contract-signing";
import {
  MAX_ATTEMPTS,
  availableChannels,
  codeMatches,
  effectiveSigner,
  maskEmail,
  maskPhone,
} from "@/lib/sign-verification";
import { SIGN_LINK_EXPIRED_MESSAGE, signLinkExpired } from "@/lib/sign-window";
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

    const signer = effectiveSigner(contract, contract.client);

    return NextResponse.json({
      success: true,
      contract: {
        status: contract.status,
        // The page needs to tell a client why the form is gone. A 404 here
        // would read as "we lost your contract" for a link that is simply old.
        expired: signLinkExpired(contract),
        signer: {
          name: signer.name,
          channels: availableChannels(signer),
        },
        fileUrl: await documentUrl(contract.fileUrl, SHARED_URL_TTL_SECONDS),
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
  signedByName: z.string().trim().min(1).max(200),
  agreed: z.literal(true),
  code: z.string().trim().regex(/^\d{6}$/),
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

    // A contract recorded as declined or expired — by the client or by hand —
    // must not be signable through a link that is still in someone's inbox.
    if (contract.status === "DECLINED" || contract.status === "EXPIRED") {
      return NextResponse.json(
        { success: false, message: "This contract is no longer open for signature." },
        { status: 409 },
      );
    }

    if (contract.status === "SIGNED") {
      return NextResponse.json(
        { success: false, message: "This contract has already been signed." },
        { status: 409 },
      );
    }

    if (signLinkExpired(contract)) {
      return NextResponse.json(
        { success: false, message: SIGN_LINK_EXPIRED_MESSAGE },
        { status: 410 },
      );
    }

    const rl = await enforceRateLimit({
      scope: "public_api",
      route: "sign_submit_ip",
      identifier: clientIpFromHeaders(request.headers),
      limit: 20,
      windowSeconds: 900,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, message: "Too many attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const validatedData = signSchema.parse(body);

    // The link alone does not sign: the designated signer must hold the code
    // that was sent to their own WhatsApp or mailbox.
    if (
      !contract.signCodeHash ||
      !contract.signCodeExpiresAt ||
      !contract.signCodeChannel ||
      contract.signCodeExpiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { success: false, message: "Your code has expired or was never sent. Request a new code.", codeExpired: true },
        { status: 400 },
      );
    }
    if (contract.signCodeAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, message: "Too many wrong codes. Request a new code.", codeExpired: true },
        { status: 400 },
      );
    }

    if (!codeMatches(contract.id, validatedData.code, contract.signCodeHash)) {
      const updated = await prisma.contract.update({
        where: { id: contract.id },
        data: { signCodeAttempts: { increment: 1 } },
        select: { signCodeAttempts: true },
      });
      const remaining = Math.max(0, MAX_ATTEMPTS - updated.signCodeAttempts);
      return NextResponse.json(
        {
          success: false,
          message:
            remaining > 0
              ? `That code is not correct. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`
              : "Too many wrong codes. Request a new code.",
          codeExpired: remaining === 0,
        },
        { status: 400 },
      );
    }

    // Consume the code atomically so two submits with the same code sign once.
    const consumed = await prisma.contract.updateMany({
      where: { id: contract.id, signCodeHash: contract.signCodeHash },
      data: { signCodeHash: null, signCodeExpiresAt: null, signCodeAttempts: 0 },
    });
    if (consumed.count === 0) {
      return NextResponse.json(
        { success: false, message: "That code was already used. Request a new code.", codeExpired: true },
        { status: 400 },
      );
    }

    const client = await prisma.client.findUniqueOrThrow({ where: { id: contract.clientId } });
    const signer = effectiveSigner(contract, client);
    const via = contract.signCodeChannel;
    const to = (via === "WHATSAPP" ? signer.phone : signer.email) ?? "";

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const { project } = await handleContractSigned({
      contractId: contract.id,
      signedByName: validatedData.signedByName,
      signedIp: ip,
      signatureMethod: "CLICK_TO_SIGN",
      baseUrl: publicBaseUrl(request),
      verification: {
        via,
        to,
        hint: via === "WHATSAPP" ? maskPhone(to) : maskEmail(to),
      },
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
        { success: false, message: "Enter your name, the 6-digit code, and confirm agreement" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to sign contract" },
      { status: 500 },
    );
  }
}
