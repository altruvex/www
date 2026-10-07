import "server-only";

import { prisma } from "@repo/database";

import { systemActor } from "@/lib/activity-log";
import { uncontactedWhere } from "@/lib/dashboard-data";
import { env } from "@/lib/env";
import { date } from "@/lib/format";
import { overdueCutoff } from "@/lib/payment-overdue";
import { notifySlack } from "@/lib/slack";
import { DAY_MS } from "@/lib/subscription-lifecycle";

/**
 * The reply window the public contact page promises ("We reply within 24
 * hours on business days", apps/www/messages/<locale>/contactPage.json
 * `replyTime`). Change both together.
 */
export const REPLY_PROMISE_HOURS = 24;

/**
 * A first deploy must not alert on every lead that ever went unanswered: only
 * leads that arrived inside this window are owed the reply alert.
 */
const REPLY_LOOKBACK_DAYS = 7;

/** The public booking page, when the site's address is configured; else no link. */
export function scheduleLink(): string | null {
  const site = env?.PUBLIC_SITE_URL;
  return site ? new URL("/schedule", site).toString() : null;
}

/**
 * Sales follow-ups stop at spam and at signing. Read from the stored record,
 * not the derived stage: the stage ranks proposals above status, so a spam
 * lead with a sent proposal would read PROPOSAL_SENT. The client page and the
 * follow-up route and the reminder sweep all ask this, so none can drift.
 */
export function followUpClosedReason(client: {
  status: string;
  contracts: { status: string }[];
  projects: unknown[];
}): string | null {
  if (client.status === "SPAM") return "This lead is marked spam.";
  if (
    client.status === "WON" ||
    client.projects.length > 0 ||
    client.contracts.some((c) => c.status === "SIGNED")
  )
    return "This client has signed; sales follow-ups have stopped.";
  return null;
}

/** One alert per lead per follow-up date — moving the date re-arms it. */
export function followUpAlertKey(clientId: string, nextActionAt: Date): string {
  return `follow-up:${clientId}:${nextActionAt.toISOString().slice(0, 10)}`;
}

/**
 * At most two reply alerts per lead: one while the promised window is still
 * open, one when it lapses. A single key would swallow the lapse for any lead
 * the sweep first saw inside its window.
 */
export function replyAlertKey(clientId: string, lapsed: boolean): string {
  return `${lapsed ? "reply-lapsed" : "reply-due"}:${clientId}`;
}

const label = (client: { name: string | null; company: string | null; phone: string }) =>
  client.name || client.company || client.phone;

/** What followUpClosedReason reads, for queries that feed it. */
const CLOSED_FIELDS = {
  status: true,
  contracts: { select: { status: true } },
  projects: { select: { id: true } },
} as const;

export interface FollowUpSweepResult {
  due: number;
  awaitingReply: number;
  notifications: number;
}

/**
 * Writes in-app alerts (and a Slack line) for leads whose follow-up date has
 * arrived and for new website leads still waiting on the promised first
 * reply. It never contacts a client: the alert links to the lead, where a
 * person decides what to send. Idempotent through Notification.dedupeKey, so
 * the cron and a manual run can overlap safely.
 */
export async function sweepLeadFollowUps(now: Date = new Date()): Promise<FollowUpSweepResult> {
  const endOfToday = new Date(overdueCutoff(now).getTime() + DAY_MS);
  const replySince = new Date(now.getTime() - REPLY_LOOKBACK_DAYS * DAY_MS);

  const [due, awaiting, admins] = await Promise.all([
    prisma.client.findMany({
      // LOST is quiet for alerts only: a person may still send a win-back
      // follow-up, so it is not part of followUpClosedReason.
      where: { nextActionAt: { lt: endOfToday }, status: { not: "LOST" } },
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        ownerId: true,
        nextActionAt: true,
        nextActionNote: true,
        ...CLOSED_FIELDS,
      },
      orderBy: { nextActionAt: "asc" },
    }),
    prisma.client.findMany({
      where: {
        AND: [
          uncontactedWhere(now),
          { source: { not: "MANUAL" }, createdAt: { gte: replySince } },
        ],
      },
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        ownerId: true,
        createdAt: true,
        ...CLOSED_FIELDS,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    }),
  ]);

  const adminIds = new Set(admins.map((admin) => admin.id));
  // The owner when there is one (and they can still sign in), everyone otherwise.
  const recipients = (ownerId: string | null) =>
    ownerId && adminIds.has(ownerId) ? [ownerId] : [...adminIds];

  let dueAlerted = 0;
  let awaitingAlerted = 0;
  let notifications = 0;

  // A signed or spam client keeps whatever nextActionAt it had; that date
  // must not raise an alert.
  for (const client of due.filter((c) => !followUpClosedReason(c))) {
    if (!client.nextActionAt) continue;
    const who = label(client);
    const overdue = client.nextActionAt.getTime() < overdueCutoff(now).getTime();
    const title = `${overdue ? "Follow-up overdue" : "Follow up today"} · ${who}`;
    const message = client.nextActionNote
      ? `${client.nextActionNote} (set for ${date(client.nextActionAt)})`
      : `The follow-up set for ${date(client.nextActionAt)} has arrived. Nothing has been sent.`;

    const { count } = await prisma.notification.createMany({
      data: recipients(client.ownerId).map((userId) => ({
        type: "FOLLOW_UP_DUE" as const,
        title,
        message,
        userId,
        entityType: "client",
        entityId: client.id,
        dedupeKey: followUpAlertKey(client.id, client.nextActionAt!),
      })),
      skipDuplicates: true,
    });
    if (count === 0) continue;
    dueAlerted += 1;
    notifications += count;

    await notifySlack({
      action: "lead.follow_up_due",
      actor: systemActor("Follow-up check"),
      entityType: "client",
      entityId: client.id,
      entityLabel: who,
      summary: client.nextActionNote
        ? `${overdue ? "Overdue" : "Due today"}: ${client.nextActionNote}`
        : `${overdue ? "Overdue" : "Due today"} — set for ${date(client.nextActionAt)}`,
    });
  }

  for (const client of awaiting.filter((c) => !followUpClosedReason(c))) {
    const who = label(client);
    const deadline = new Date(client.createdAt.getTime() + REPLY_PROMISE_HOURS * 3_600_000);
    const lapsed = deadline.getTime() <= now.getTime();
    const title = `${lapsed ? "Reply promise lapsed" : "Reply due"} · ${who}`;
    const message = lapsed
      ? `Arrived ${date(client.createdAt)} and nobody has replied. The site promises a reply within ${REPLY_PROMISE_HOURS} hours on business days.`
      : `Arrived ${date(client.createdAt)}. The site promises a reply within ${REPLY_PROMISE_HOURS} hours on business days.`;

    const { count } = await prisma.notification.createMany({
      data: recipients(client.ownerId).map((userId) => ({
        type: "FOLLOW_UP_DUE" as const,
        title,
        message,
        userId,
        entityType: "client",
        entityId: client.id,
        dedupeKey: replyAlertKey(client.id, lapsed),
      })),
      skipDuplicates: true,
    });
    if (count === 0) continue;
    awaitingAlerted += 1;
    notifications += count;

    await notifySlack({
      action: "lead.follow_up_due",
      actor: systemActor("Follow-up check"),
      entityType: "client",
      entityId: client.id,
      entityLabel: who,
      summary: lapsed
        ? `No reply yet — the ${REPLY_PROMISE_HOURS}-hour reply promise has lapsed`
        : `No reply yet — first reply promised within ${REPLY_PROMISE_HOURS} hours`,
    });
  }

  return { due: dueAlerted, awaitingReply: awaitingAlerted, notifications };
}
