import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIpFromHeaders, enforceRateLimit, prisma } from "@repo/database";
import { SIGN_LINK_EXPIRED_MESSAGE, signLinkExpired } from "@/lib/sign-window";
import {
  CODE_TTL_MINUTES,
  CodeDeliveryError,
  RESEND_COOLDOWN_SECONDS,
  availableChannels,
  effectiveSigner,
  issueSignCode,
} from "@/lib/sign-verification";

export const dynamic = "force-dynamic";

const schema = z.object({ channel: z.enum(["whatsapp", "email"]) });

function fail(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

/**
 * Sends the designated signer a one-time code. Public by design — the caller
 * holds only the sign link — so it is limited per link and per IP, and the
 * code only ever goes to the address on the contract, never one supplied here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  for (const [route, identifier, limit] of [
    ["sign_code_token", token, 5],
    ["sign_code_ip", clientIpFromHeaders(request.headers), 15],
  ] as const) {
    const rl = await enforceRateLimit({
      scope: "public_api",
      route,
      identifier,
      limit,
      windowSeconds: 900,
    });
    if (!rl.ok) {
      return fail("Too many codes requested. Please wait and try again.", 429, {
        retryAfterSeconds: rl.retryAfterSeconds,
      });
    }
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Choose where to send the code.", 400);

  const contract = await prisma.contract.findUnique({
    where: { signToken: token },
    include: { client: true },
  });
  if (!contract) return fail("Contract not found", 404);
  if (contract.status !== "SENT" && contract.status !== "DRAFT") {
    return fail("This contract is no longer open for signature.", 409);
  }
  if (signLinkExpired(contract)) return fail(SIGN_LINK_EXPIRED_MESSAGE, 410);

  if (contract.signCodeSentAt) {
    const elapsed = (Date.now() - contract.signCodeSentAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      return fail(`A code was just sent. You can ask for another in ${wait} seconds.`, 429, {
        retryAfterSeconds: wait,
      });
    }
  }

  const signer = effectiveSigner(contract, contract.client);
  if (!availableChannels(signer).some((c) => c.channel === parsed.data.channel)) {
    return fail("That delivery option is not available for this agreement.", 400);
  }

  try {
    const { hint, expiresAt } = await issueSignCode({
      contract,
      client: contract.client,
      signer,
      channel: parsed.data.channel,
    });
    return NextResponse.json({
      success: true,
      sentTo: hint,
      expiresAt,
      ttlMinutes: CODE_TTL_MINUTES,
      resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error sending signing code:", error);
    }
    return fail(
      error instanceof CodeDeliveryError ? error.message : "The code could not be sent.",
      502,
    );
  }
}
