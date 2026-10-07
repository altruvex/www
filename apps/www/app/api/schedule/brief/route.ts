import { NextResponse, type NextRequest } from "next/server";
import {
  apiError,
  readJsonBody,
  tooManyRequests,
  unexpectedError,
} from "@/lib/server/api-error";
import {
  consumeStepToken,
  invalidStepToken,
} from "@/lib/server/contact/step-token";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { preCallBriefSchema } from "@/lib/validations/contact";

// Optional pre-call brief after a successful /api/schedule. Written on the
// newest meeting of the submission the step token belongs to.
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("forbidden");
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "schedule_brief",
      limit: 5,
      windowSeconds: 10 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(rl.retryAfterSeconds);
    }

    const body = await readJsonBody(request);
    if (!body) return apiError("bad_request");

    const { token, current, change, stakes } = preCallBriefSchema.parse(body);

    // The token is spent only when there is a meeting to write the brief on.
    const saved = await consumeStepToken(token, async (tx, submissionId) => {
      const meeting = await tx.meeting.findFirst({
        where: { submissionId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!meeting) return false;
      await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          preCallBrief: { current, change, stakes },
          preCallBriefAt: new Date(),
        },
      });
      return true;
    });
    if (!saved) return invalidStepToken();

    return NextResponse.json({ ok: true, code: "briefed" }, { status: 200 });
  } catch (error: unknown) {
    return unexpectedError(error, "Pre-call brief error");
  }
}
