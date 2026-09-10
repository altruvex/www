import { NextResponse } from "next/server";
import { z } from "zod";

import { getActionCentre } from "@/lib/action-center";
import {
  SlackNotConfiguredError,
  buildDigestMessage,
  postToSlack,
} from "@/lib/slack";
import { withAdmin } from "@/lib/with-admin";

/**
 * The two things a human asks Slack to do on purpose (§26).
 *
 * Event notifications need no endpoint — they ride the audit trail. What needs
 * one is proving the webhook works, and posting the action centre on demand.
 *
 * Unlike `notifySlack`, these do **not** swallow failures. A button that says
 * "sent" over a webhook that rejected the payload is exactly the lie the
 * honesty rule exists to prevent.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({ action: z.enum(["test", "digest"]) });

export const POST = withAdmin(async (request, { session }) => {
  const { action } = bodySchema.parse(await request.json());

  const message =
    action === "test"
      ? {
          text: "Altruvex OS is connected to this channel.",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:satellite_antenna: *Altruvex OS is connected to this channel.*\nSent by ${session.user.name || session.user.email}.`,
              },
            },
          ],
        }
      : buildDigestMessage(await getActionCentre());

  try {
    await postToSlack(message);
  } catch (error) {
    if (error instanceof SlackNotConfiguredError) {
      return NextResponse.json(
        { success: false, message: "SLACK_WEBHOOK_URL is not set on this instance." },
        { status: 503 },
      );
    }
    // Slack's own words, not a generic failure: "invalid_payload" and
    // "no_service" name completely different fixes, and the operator is the one
    // who has to make them.
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Posting to Slack failed.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: action === "test" ? "Test message posted." : "Action centre posted.",
  });
});
