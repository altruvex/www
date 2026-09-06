import type { TimelineEvent } from "@/components/os/timeline";
import { money, titleCaseSafe } from "@/lib/activity-helpers";
import { statusOf } from "@/lib/status";

export type ActivityCategory =
  | "all"
  | "messages"
  | "proposals"
  | "contracts"
  | "clients"
  | "payments"
  | "meetings";

export interface ActivitySources {
  client?: {
    id: string;
    name: string | null;
    company: string | null;
    source: string;
    createdAt: Date;
  } | null;
  submission?: {
    id: string;
    name?: string | null;
    submittedAt: Date;
    firstViewedAt: Date | null;
    firstContactedAt: Date | null;
    utmSource: string | null;
    referrer: string | null;
    serviceInterest: string | null;
  } | null;
  transparencyLead?: {
    id: string;
    createdAt: Date;
    convertedAt: Date | null;
    priceMin: number;
    priceMax: number;
    projectType: string;
  } | null;
  proposals?: {
    id: string;
    createdAt: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    respondedAt: Date | null;
    status: string;
    totalPrice: number;
    currency: string;
    validUntil: Date;
    client?: { name: string | null; company: string | null } | null;
  }[];
  contracts?: {
    id: string;
    createdAt: Date;
    status: string;
    signedAt: Date | null;
    signedByName: string | null;
    onboardingMessageSentAt: Date | null;
    client?: { name: string | null; company: string | null } | null;
  }[];
  projects?: {
    id: string;
    name: string;
    createdAt: Date;
    phase: string;
    actualLaunchDate: Date | null;
    client?: { name: string | null; company: string | null } | null;
  }[];
  payments?: {
    id: string;
    milestone: string;
    amount: number;
    status: string;
    paidAt: Date | null;
    dueDate: Date | null;
    projectId: string;
    currency?: string;
    project?: { name: string; client?: { name: string | null; company: string | null } | null } | null;
  }[];
  messages?: {
    id: string;
    direction: string;
    body: string;
    createdAt: Date;
    status: string;
    templateName: string | null;
    client?: { id: string; name: string | null; company: string | null } | null;
  }[];
  meetings?: {
    id: string;
    title: string;
    type: string;
    status: string;
    scheduledDate: Date;
    scheduledTime: string;
    createdAt: Date;
    completedAt: Date | null;
    guestName?: string | null;
    contactSubmission?: { name: string | null } | null;
    client?: { name: string | null; company: string | null } | null;
  }[];
}

export function buildActivity(sources: ActivitySources): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const push = (e: TimelineEvent | null) => {
    if (e) events.push(e);
  };

  const { client, submission, transparencyLead } = sources;

  const getClientLabel = (c?: { name: string | null; company: string | null } | null) => {
    if (!c) return undefined;
    if (c.name && c.company) return `${c.name} (${c.company})`;
    return c.name || c.company || undefined;
  };

  /* ---- origin -------------------------------------------------------- */
  if (submission) {
    const submitter = submission.name ? `Inquiry from ${submission.name}` : "Website inquiry received";
    push({
      id: `sub-${submission.id}`,
      at: submission.submittedAt,
      iconName: "Globe",
      tone: "info",
      title: submitter,
      detail: [
        submission.serviceInterest
          ? statusOf("serviceType", submission.serviceInterest).label
          : undefined,
        submission.utmSource && `via ${submission.utmSource}`,
      ]
        .filter(Boolean)
        .join(" · ") || "Direct web lead",
      meta: [
        submission.utmSource && `utm_source=${submission.utmSource}`,
        submission.referrer && `ref=${trimUrl(submission.referrer)}`,
      ]
        .filter(Boolean)
        .join("  ") || undefined,
      href: `/submissions/${submission.id}`,
      category: "clients",
    });
    if (submission.firstViewedAt)
      push({
        id: `sub-view-${submission.id}`,
        at: submission.firstViewedAt,
        iconName: "Eye",
        tone: "neutral",
        title: "Submission opened by team",
        detail: submission.name ?? undefined,
        category: "clients",
      });
    if (submission.firstContactedAt)
      push({
        id: `sub-contact-${submission.id}`,
        at: submission.firstContactedAt,
        iconName: "Handshake",
        tone: "progress",
        title: "First contact made",
        detail: submission.name ?? undefined,
        category: "clients",
      });
  }

  if (transparencyLead) {
    push({
      id: `tl-${transparencyLead.id}`,
      at: transparencyLead.createdAt,
      iconName: "Globe",
      tone: "info",
      title: "Estimator completed on public site",
      detail: titleCaseSafe(transparencyLead.projectType),
      meta: `quoted ${money(transparencyLead.priceMin)} – ${money(transparencyLead.priceMax)}`,
      href: `/transparency`,
      category: "clients",
    });
  }

  if (client) {
    const clientLabel = getClientLabel(client);
    push({
      id: `client-${client.id}`,
      at: client.createdAt,
      iconName: "UserPlus",
      tone: "info",
      title: "Client record created",
      detail: [clientLabel, statusOf("clientSource", client.source).label]
        .filter(Boolean)
        .join(" · "),
      category: "clients",
    });
  }

  /* ---- proposals ------------------------------------------------------ */
  for (const p of sources.proposals ?? []) {
    const amount = money(p.totalPrice, p.currency);
    const clientName = getClientLabel(p.client);
    const detailText = [clientName, amount].filter(Boolean).join(" · ");
    push({
      id: `p-created-${p.id}`,
      at: p.createdAt,
      iconName: "FileText",
      tone: "neutral",
      title: "Proposal drafted",
      detail: detailText,
      href: `/proposals/${p.id}`,
      category: "proposals",
    });
    if (p.sentAt)
      push({
        id: `p-sent-${p.id}`,
        at: p.sentAt,
        iconName: "Send",
        tone: "info",
        title: "Proposal sent",
        detail: detailText,
        href: `/proposals/${p.id}`,
        category: "proposals",
      });
    if (p.deliveredAt)
      push({
        id: `p-del-${p.id}`,
        at: p.deliveredAt,
        iconName: "CheckCircle2",
        tone: "info",
        title: "Proposal delivered to device",
        detail: clientName,
        href: `/proposals/${p.id}`,
        category: "proposals",
      });
    if (p.readAt)
      push({
        id: `p-read-${p.id}`,
        at: p.readAt,
        iconName: "Eye",
        tone: "progress",
        title: "Proposal read by client",
        detail: clientName,
        href: `/proposals/${p.id}`,
        category: "proposals",
      });
    if (p.respondedAt)
      push({
        id: `p-resp-${p.id}`,
        at: p.respondedAt,
        iconName: p.status === "ACCEPTED" ? "CheckCircle2" : "Flag",
        tone: p.status === "ACCEPTED" ? "success" : "danger",
        title: p.status === "ACCEPTED" ? "Proposal accepted" : "Proposal rejected",
        detail: detailText,
        href: `/proposals/${p.id}`,
        category: "proposals",
      });
  }

  /* ---- contracts ------------------------------------------------------ */
  for (const c of sources.contracts ?? []) {
    const clientName = getClientLabel(c.client);
    push({
      id: `c-created-${c.id}`,
      at: c.createdAt,
      iconName: "FileSignature",
      tone: "neutral",
      title: "Contract generated",
      detail: clientName,
      href: `/contracts/${c.id}`,
      category: "contracts",
    });
    if (c.signedAt)
      push({
        id: `c-signed-${c.id}`,
        at: c.signedAt,
        iconName: "PenLine",
        tone: "success",
        title: "Contract signed",
        detail: [clientName, c.signedByName ? `signed by ${c.signedByName}` : undefined].filter(Boolean).join(" · "),
        href: `/contracts/${c.id}`,
        category: "contracts",
      });
    if (c.onboardingMessageSentAt)
      push({
        id: `c-onb-${c.id}`,
        at: c.onboardingMessageSentAt,
        iconName: "MessageCircle",
        tone: "success",
        title: "Onboarding message sent",
        detail: clientName,
        href: `/contracts/${c.id}`,
        category: "contracts",
      });
  }

  /* ---- projects ------------------------------------------------------- */
  for (const pr of sources.projects ?? []) {
    const clientName = getClientLabel(pr.client);
    push({
      id: `pr-created-${pr.id}`,
      at: pr.createdAt,
      iconName: "Rocket",
      tone: "progress",
      title: "Project created",
      detail: [pr.name, clientName].filter(Boolean).join(" · "),
      href: `/projects/${pr.id}`,
      category: "contracts",
    });
    if (pr.actualLaunchDate)
      push({
        id: `pr-launch-${pr.id}`,
        at: pr.actualLaunchDate,
        iconName: "Rocket",
        tone: "success",
        title: "Project launched",
        detail: [pr.name, clientName].filter(Boolean).join(" · "),
        href: `/projects/${pr.id}`,
        category: "contracts",
      });
  }

  /* ---- payments ------------------------------------------------------- */
  for (const pay of sources.payments ?? []) {
    if (pay.paidAt) {
      const clientName = getClientLabel(pay.project?.client);
      const projName = pay.project?.name;
      push({
        id: `pay-${pay.id}`,
        at: pay.paidAt,
        iconName: "Wallet",
        tone: "success",
        title: "Payment received",
        detail: [
          clientName || projName,
          statusOf("paymentMilestone", pay.milestone).label,
          money(pay.amount, pay.currency ?? "EGP"),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/projects/${pay.projectId}`,
        category: "payments",
      });
    }
  }

  /* ---- meetings ------------------------------------------------------- */
  for (const m of sources.meetings ?? []) {
    const clientName = getClientLabel(m.client) || m.guestName || m.contactSubmission?.name;
    push({
      id: `m-${m.id}`,
      at: m.createdAt,
      iconName: "CalendarDays",
      tone: "info",
      title: `${statusOf("meetingType", m.type).label} meeting requested`,
      detail: [m.title, clientName].filter(Boolean).join(" · "),
      meta: `${localDay(m.scheduledDate)} ${m.scheduledTime}`,
      href: `/calendar`,
      category: "meetings",
    });
    if (m.completedAt)
      push({
        id: `m-done-${m.id}`,
        at: m.completedAt,
        iconName: "CheckCircle2",
        tone: "success",
        title: "Meeting completed",
        detail: [m.title, clientName].filter(Boolean).join(" · "),
        category: "meetings",
      });
  }

  /* ---- messages ------------------------------------------------------- */
  for (const msg of sources.messages ?? []) {
    const msgClient = msg.client ?? client;
    const clientName = getClientLabel(msgClient);
    push({
      id: `msg-${msg.id}`,
      at: msg.createdAt,
      iconName: "MessageCircle",
      tone:
        msg.status === "FAILED"
          ? "danger"
          : msg.direction === "INBOUND"
            ? "progress"
            : "neutral",
      title:
        msg.direction === "INBOUND"
          ? `Message from ${clientName ?? "client"}`
          : `Message sent to ${clientName ?? "client"}`,
      detail: truncateBody(msg.body),
      meta: msg.templateName ? `template: ${msg.templateName}` : undefined,
      href: msgClient ? `/whatsapp/${msgClient.id}` : undefined,
      category: "messages",
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function truncateBody(body: string) {
  // Sanitize raw URLs in message bodies so localhost debug links don't clutter the UI
  const cleaned = body.replace(/https?:\/\/[^\s]+/g, (url) => {
    if (url.includes("/sign/")) return "[Contract signing link]";
    if (url.includes("/proposal")) return "[Proposal link]";
    try {
      const parsed = new URL(url);
      return `[${parsed.hostname}]`;
    } catch {
      return "[Link]";
    }
  });
  const single = cleaned.replace(/\s+/g, " ").trim();
  return single.length > 75 ? `${single.slice(0, 74)}…` : single;
}

/** Local calendar day, matching lib/calendar-data.ts — never the UTC slice. */
function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function trimUrl(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

