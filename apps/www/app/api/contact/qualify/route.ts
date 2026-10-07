import { BUDGET_ANSWER_TO_DB, isBudgetAnswerId } from "@repo/pricing-schema";
import {
  DecisionRole,
  ProjectSituation,
  ProjectTimeline,
} from "@repo/database";
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
import {
  qualifySchema,
  type QUALIFY_DECISION_ROLES,
  type QUALIFY_SITUATIONS,
  type QUALIFY_TIMELINES,
} from "@/lib/validations/contact";

const SITUATION_MAP: Record<
  (typeof QUALIFY_SITUATIONS)[number],
  ProjectSituation
> = {
  "new-build": ProjectSituation.NEW_BUILD,
  "replace-existing": ProjectSituation.REPLACE_EXISTING,
  "improve-existing": ProjectSituation.IMPROVE_EXISTING,
};

const TIMELINE_MAP: Record<
  (typeof QUALIFY_TIMELINES)[number],
  ProjectTimeline
> = {
  immediate: ProjectTimeline.IMMEDIATE,
  soon: ProjectTimeline.SOON,
  planning: ProjectTimeline.PLANNING,
  exploring: ProjectTimeline.EXPLORING,
};

const DECISION_ROLE_MAP: Record<
  (typeof QUALIFY_DECISION_ROLES)[number],
  DecisionRole
> = {
  decides: DecisionRole.DECIDES,
  shared: DecisionRole.SHARED,
  advises: DecisionRole.ADVISES,
};

// Optional second step after a successful /api/contact. The step token from
// that response is the only key; answers are ids, mapped to enums here.
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("forbidden");
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "contact_qualify",
      limit: 5,
      windowSeconds: 10 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(rl.retryAfterSeconds);
    }

    const body = await readJsonBody(request);
    if (!body) return apiError("bad_request");

    const data = qualifySchema.parse(body);

    // Answers left out are not written; the token is spent by this write.
    const saved = await consumeStepToken(
      data.token,
      async (tx, submissionId) => {
        await tx.contactSubmission.update({
          where: { id: submissionId },
          data: {
            situation: data.situation
              ? SITUATION_MAP[data.situation]
              : undefined,
            budget:
              data.budget && isBudgetAnswerId(data.budget)
                ? BUDGET_ANSWER_TO_DB[data.budget]
                : undefined,
            projectTimeline: data.projectTimeline
              ? TIMELINE_MAP[data.projectTimeline]
              : undefined,
            decisionRole: data.decisionRole
              ? DECISION_ROLE_MAP[data.decisionRole]
              : undefined,
            qualifiedAt: new Date(),
          },
        });
        return true;
      },
    );
    if (!saved) return invalidStepToken();

    return NextResponse.json({ ok: true, code: "qualified" }, { status: 200 });
  } catch (error: unknown) {
    return unexpectedError(error, "Contact qualify error");
  }
}
