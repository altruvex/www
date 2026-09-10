import type { ActionItem } from "@/lib/action-center";
import type { RecordActivityInput } from "@/lib/activity-log";

/**
 * Slack, one direction only (§26).
 *
 * An incoming webhook and nothing else: no OAuth app, no bot token, no stored
 * credential per user. The whole integration is one URL in the environment,
 * which is why it costs nothing to run and nothing to keep alive.
 *
 * It is deliberately not a second audit log. `/audit` already records every
 * mutation, and a channel that receives all of them is a channel nobody reads —
 * at which point the one message that mattered is buried. What goes to Slack is
 * the curated set below: the events that would make somebody put down what they
 * are doing.
 */

const MAX_TEXT = 2900;

export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

/**
 * The admin app's own address, used to make every message clickable.
 *
 * A notification that says a contract was signed but not which one, or where to
 * look, costs more attention than it saves. Falls back to the auth URL, which is
 * the same origin, and to no link at all rather than a broken one.
 */
function appUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  return base ? base.replace(/\/$/, "") : null;
}

/** Where an entity lives in this application, for the message's link. */
const ENTITY_PATH: Record<string, (id: string) => string> = {
  client: (id) => `/clients/${id}`,
  submission: (id) => `/submissions/${id}`,
  proposal: (id) => `/proposals/${id}`,
  contract: (id) => `/contracts/${id}`,
  project: (id) => `/projects/${id}`,
  product: (id) => `/products/${id}`,
  payment: () => "/payments",
  subscription: () => "/maintenance",
  maintenance_request: () => "/maintenance",
  incident: () => "/incidents",
  deployment: () => "/deployments",
  build: () => "/deployments?tab=builds",
  task: () => "/tasks",
  meeting: () => "/calendar",
};

export function entityUrl(entityType: string, entityId: string): string | null {
  const base = appUrl();
  const path = ENTITY_PATH[entityType];
  if (!base || !path) return null;
  return `${base}${path(entityId)}`;
}

/* -------------------------------------------------------------------------- */
/* What is worth interrupting somebody for                                    */
/* -------------------------------------------------------------------------- */

/**
 * The curated set, with the emoji each event carries.
 *
 * The test is not "did something happen" — everything that happens is already
 * in `/audit`. The test is "would a person want to know within the minute".
 * A signed contract and a failed production deploy pass it; a viewed submission,
 * a renamed product and a successful build do not, and a channel that included
 * them would train everyone to ignore it.
 */
export const NOTIFIED_ACTIONS: Record<string, string> = {
  "client.created": ":wave:",
  "proposal.sent": ":outbox_tray:",
  "contract.sent": ":pencil:",
  "contract.signed": ":handshake:",
  "project.created": ":rocket:",
  "payment.status_changed": ":moneybag:",
  "subscription.created": ":repeat:",
  "subscription.cancelled": ":wastebasket:",
  "incident.opened": ":rotating_light:",
  "build.failed": ":red_circle:",
  "deployment.failed": ":red_circle:",
  "deployment.rolled_back": ":rewind:",
};

/** Deletions all read the same way and all deserve a line in the channel. */
const DELETED_SUFFIX = ".deleted";

export function shouldNotify(action: string): boolean {
  return action in NOTIFIED_ACTIONS || action.endsWith(DELETED_SUFFIX);
}

export function emojiFor(action: string): string {
  return NOTIFIED_ACTIONS[action] ?? (action.endsWith(DELETED_SUFFIX) ? ":x:" : ":information_source:");
}

/**
 * Turns "contract.signed" into "Contract signed".
 *
 * Read from the action rather than hand-written per event, so a new action
 * added at a mutation site cannot arrive in the channel as a raw identifier.
 */
export function headlineFor(action: string): string {
  const words = action.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Message construction                                                       */
/* -------------------------------------------------------------------------- */

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: { type: string; text: string }[];
}

export interface SlackMessage {
  /** Plain-text fallback: what a phone notification shows. */
  text: string;
  blocks: SlackBlock[];
}

const truncate = (value: string, max = MAX_TEXT) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/**
 * Slack's mrkdwn is not Markdown. Only these three characters change meaning,
 * and escaping them is what stops a client called "Smith & Sons <Holdings>"
 * from rendering as broken markup.
 */
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
    // Escaped as well: Slack renders the fallback in the phone notification and
    // in clients that cannot draw blocks, so an unescaped client name is broken
    // markup in exactly the place somebody reads first.
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

/**
 * The action centre as one message.
 *
 * Posted on demand rather than on a timer: there is no scheduler in this
 * application, and inventing one that fires from a page view would mean the
 * digest arrives only when somebody is already looking at the list it
 * summarises.
 */
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

  // Ten, because a message longer than a screen is a message nobody finishes.
  // The count of what was left out is more useful than the items themselves.
  const shown = items.slice(0, 10);
  const rest = items.length - shown.length;

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
            `:clipboard: *Action centre — ${items.length} item${items.length === 1 ? "" : "s"}*\n${lines.join("\n")}`,
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

/* -------------------------------------------------------------------------- */
/* Delivery                                                                   */
/* -------------------------------------------------------------------------- */

export class SlackNotConfiguredError extends Error {
  constructor() {
    super("SLACK_WEBHOOK_URL is not set.");
    this.name = "SlackNotConfiguredError";
  }
}

/**
 * Posts, with a hard ceiling on how long it may take.
 *
 * This runs inline with a mutation the operator is waiting on, so a Slack
 * outage must cost four seconds and not a hung request. Throws — the callers
 * that must not fail wrap it; the one that reports success to a human does not.
 */
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
    // Slack answers a webhook with a plain-text reason ("invalid_payload",
    // "no_service"), which is worth far more in a log than the status alone.
    const detail = await response.text().catch(() => "");
    throw new Error(`Slack returned ${response.status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * The fire-and-forget path used by the audit trail.
 *
 * Never throws, for the same reason `recordActivity` never throws: a
 * notification about a mutation must not be able to break the mutation.
 */
export async function notifySlack(input: RecordActivityInput): Promise<void> {
  if (!slackConfigured() || !shouldNotify(input.action)) return;
  try {
    await postToSlack(buildEventMessage(input));
  } catch (error) {
    console.error(`Slack notification failed for ${input.action}`, error);
  }
}
