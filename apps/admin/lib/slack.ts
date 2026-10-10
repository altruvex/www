import type { ActionItem } from "@/lib/action-center";
import type { RecordActivityInput } from "@/lib/activity-log";
import { entityHref } from "@/lib/entity-links";

const MAX_TEXT = 2900;

export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

function appUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  return base ? base.replace(/\/$/, "") : null;
}

export function entityUrl(entityType: string, entityId: string): string | null {
  const base = appUrl();
  const path = entityHref(entityType, entityId);
  if (!base || !path) return null;
  return `${base}${path}`;
}

export const NOTIFIED_ACTIONS: Record<string, string> = {
  "client.created": ":wave:",
  "proposal.sent": ":outbox_tray:",
  "proposal.accepted": ":white_check_mark:",
  "contract.sent": ":pencil:",
  "contract.signed": ":handshake:",
  "project.created": ":rocket:",
  "project.completed": ":checkered_flag:",
  "change_request.approved": ":memo:",
  "payment.status_changed": ":moneybag:",
  "subscription.created": ":repeat:",
  "subscription.cancelled": ":wastebasket:",
  "incident.opened": ":rotating_light:",
  "build.failed": ":red_circle:",
  "deployment.failed": ":red_circle:",
  "deployment.rolled_back": ":rewind:",
  "service.renewal_due": ":hourglass_flowing_sand:",
  "lead.follow_up_due": ":alarm_clock:",
};

const DELETED_SUFFIX = ".deleted";

export function shouldNotify(action: string): boolean {
  return action in NOTIFIED_ACTIONS || action.endsWith(DELETED_SUFFIX);
}

export function emojiFor(action: string): string {
  return NOTIFIED_ACTIONS[action] ?? (action.endsWith(DELETED_SUFFIX) ? ":x:" : ":information_source:");
}

export function headlineFor(action: string): string {
  const words = action.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: { type: string; text: string }[];
}

export interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

const truncate = (value: string, max = MAX_TEXT) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function escapeMrkdwn(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const link = (url: string | null, label: string) =>
  url ? `<${url}|${escapeMrkdwn(label)}>` : `*${escapeMrkdwn(label)}*`;

export function buildEventMessage(input: RecordActivityInput): SlackMessage {
  const url = entityUrl(input.entityType, input.entityId);
  const label = input.entityLabel || `${input.entityType} ${input.entityId.slice(0, 8)}`;
  const headline = `${emojiFor(input.action)} *${headlineFor(input.action)}*`;

  return {
    text: truncate(
      escapeMrkdwn(`${headlineFor(input.action)}: ${label} — ${input.summary}`),
      300,
    ),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncate(`${headline}\n${link(url, label)} — ${escapeMrkdwn(input.summary)}`),
        },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: truncate(escapeMrkdwn(`${input.actor.label} · Altruvex OS`), 300) },
        ],
      },
    ],
  };
}

export function buildDigestMessage(items: ActionItem[]): SlackMessage {
  const base = appUrl();
  if (items.length === 0) {
    return {
      text: "Action centre: nothing needs a human right now.",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: ":white_check_mark: *Action centre*\nNothing needs a human right now." },
        },
      ],
    };
  }

  const shown = items.slice(0, 10);
  const rest = items.length - shown.length;
  // The channel is the team's, so the digest is the whole team's list (All);
  // owner-scoped items are split so unowned work is not read as anyone's.
  const owned = items.filter((item) => typeof item.ownerId === "string").length;
  const unassigned = items.filter((item) => item.ownerId === null).length;
  const split =
    owned + unassigned > 0 ? ` · whole team: ${owned} owned, ${unassigned} unassigned` : "";

  const lines = shown.map((item) => {
    const url = base ? `${base}${item.href}` : null;
    const age = item.ageDays > 0 ? ` · ${item.ageDays}d` : "";
    return `• ${link(url, item.title)} — ${escapeMrkdwn(item.detail)}${age}`;
  });

  return {
    text: `Action centre: ${items.length} item${items.length === 1 ? "" : "s"} need a human.`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncate(
            `:clipboard: *Action centre — ${items.length} item${items.length === 1 ? "" : "s"}*${split}\n${lines.join("\n")}`,
          ),
        },
      },
      ...(rest > 0
        ? [
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `${rest} more${base ? ` · <${base}/actions|open the action centre>` : ""}`,
                },
              ],
            },
          ]
        : []),
    ],
  };
}

export class SlackNotConfiguredError extends Error {
  constructor() {
    super("SLACK_WEBHOOK_URL is not set.");
    this.name = "SlackNotConfiguredError";
  }
}

export async function postToSlack(message: SlackMessage): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new SlackNotConfiguredError();

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Slack returned ${response.status}: ${detail.slice(0, 200)}`);
  }
}

export async function notifySlack(input: RecordActivityInput): Promise<void> {
  if (!slackConfigured() || !shouldNotify(input.action)) return;
  try {
    await postToSlack(buildEventMessage(input));
  } catch (error) {
    console.error(`Slack notification failed for ${input.action}`, error);
  }
}
