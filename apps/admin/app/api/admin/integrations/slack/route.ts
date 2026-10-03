import { getActionCentre } from "@/lib/action-center";
import {
  SlackNotConfiguredError,
  buildDigestMessage,
  postToSlack,
} from "@/lib/slack";
import { withAdmin } from "@/lib/with-admin";
import { NextResponse } from "next/server";
import { z } from "zod";


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
}, { can: ["edit", "integration"] });
