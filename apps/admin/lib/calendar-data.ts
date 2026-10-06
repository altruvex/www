import { prisma } from "@repo/database";
import { money } from "@/lib/format";
import { paymentCurrency, paymentSourceHref, paymentSourceLabel } from "@/lib/payment-source";
import type { Tone } from "@/lib/status";
import { PROJECT_CURRENCY_SELECT } from "@/lib/project-currency";

export type CalendarKind =
  | "meeting"
  | "proposal-expiry"
  | "launch-target"
  | "payment-due"
  | "contract-sent";

export interface CalendarEntry {
  id: string;
  kind: CalendarKind;
  date: string;
  time?: string;
  title: string;
  detail?: string;
  href: string;
  tone: Tone;
  status?: string;
  with?: { label: string; type?: "client" | "submission"; id?: string };
}

export const localDay = (ymd: string) => new Date(`${ymd}T00:00:00`);

export const clientLabel = (c: { name: string | null; company: string | null }) =>
  c.company || c.name || "Unnamed client";

export function meetingWith(m: {
  client: { id: string; name: string | null; company: string | null } | null;
  contactSubmission: { id: string; name: string } | null;
  guestName: string | null;
}): CalendarEntry["with"] {
  if (m.client) return { type: "client", id: m.client.id, label: clientLabel(m.client) };
  if (m.contactSubmission) {
    return { type: "submission", id: m.contactSubmission.id, label: m.contactSubmission.name };
  }
  return m.guestName ? { label: m.guestName } : undefined;
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function getCalendarEntries(from: Date, to: Date): Promise<CalendarEntry[]> {
  const [meetings, proposals, projects, payments, contracts] = await Promise.all([
    prisma.meeting.findMany({
      where: { scheduledDate: { gte: from, lte: to } },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledDate: true,
        scheduledTime: true,
        durationMinutes: true,
        guestName: true,
        contactSubmission: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, company: true } },
      },
    }),
    prisma.proposal.findMany({
      where: {
        validUntil: { gte: from, lte: to },
        status: { in: ["SENT", "DELIVERED", "READ", "VIEWED"] },
      },
      select: {
        id: true,
        validUntil: true,
        totalPrice: true,
        currency: true,
        client: { select: { name: true, company: true } },
      },
    }),
    prisma.project.findMany({
      where: { targetLaunchDate: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      select: { id: true, name: true, targetLaunchDate: true, phase: true, actualLaunchDate: true },
    }),
    prisma.payment.findMany({
      where: { dueDate: { gte: from, lte: to } },
      select: {
        id: true,
        dueDate: true,
        amount: true,
        milestone: true,
        status: true,
        project: {
          select: { id: true, name: true, ...PROJECT_CURRENCY_SELECT },
        },
        subscription: { select: { planId: true } },
      },
    }),
    prisma.contract.findMany({
      where: { status: "SENT", createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        createdAt: true,
        client: { select: { name: true, company: true } },
      },
    }),
  ]);

  const label = clientLabel;

  const entries: CalendarEntry[] = [
    ...meetings.map((m) => ({
      id: `m-${m.id}`,
      kind: "meeting" as const,
      date: dayKey(m.scheduledDate),
      time: m.scheduledTime,
      title: m.title,
      detail: `${m.durationMinutes} min`,
      with: meetingWith(m),
      href: `/calendar?meeting=${m.id}`,
      tone:
        m.status === "PENDING"
          ? ("warning" as Tone)
          : m.status === "COMPLETED"
            ? ("success" as Tone)
            : m.status === "CANCELLED" || m.status === "REJECTED"
              ? ("neutral" as Tone)
              : ("info" as Tone),
      status: m.status,
    })),
    ...proposals.map((p) => ({
      id: `p-${p.id}`,
      kind: "proposal-expiry" as const,
      date: dayKey(p.validUntil),
      title: `Proposal expires · ${label(p.client)}`,
      detail: `${p.currency} ${p.totalPrice.toLocaleString()} stops being committed`,
      href: `/proposals/${p.id}`,
      tone: "warning" as Tone,
    })),
    ...projects.map((pr) => ({
      id: `pr-${pr.id}`,
      kind: "launch-target" as const,
      date: dayKey(pr.targetLaunchDate!),
      title: `Target launch · ${pr.name}`,
      detail: pr.actualLaunchDate ? "already launched" : `currently in ${pr.phase.toLowerCase().replace(/_/g, " ")}`,
      href: `/projects/${pr.id}#phases`,
      tone: pr.actualLaunchDate ? ("success" as Tone) : ("progress" as Tone),
    })),
    ...payments.map((pay) => ({
      id: `pay-${pay.id}`,
      kind: "payment-due" as const,
      date: dayKey(pay.dueDate!),
      title: `Payment due · ${paymentSourceLabel(pay)}`,
      detail: money(pay.amount, paymentCurrency(pay)),
      href: paymentSourceHref(pay),
      tone: pay.status === "PAID" ? ("success" as Tone) : ("danger" as Tone),
      status: pay.status,
    })),
    ...contracts.map((c) => ({
      id: `c-${c.id}`,
      kind: "contract-sent" as const,
      date: dayKey(c.createdAt),
      title: `Contract awaiting signature · ${label(c.client)}`,
      href: `/contracts/${c.id}`,
      tone: "warning" as Tone,
    })),
  ];

  return entries.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}
