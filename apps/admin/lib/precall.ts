import "server-only";
import { prisma } from "@repo/database";
import {
  budgetAnswerFromDb,
  budgetOptionsView,
  type ResolvedPricing,
} from "@repo/pricing-schema";
import {
  STAGE_MEETINGS_SELECT,
  callState,
  deriveClientStage,
  type DerivedStage,
} from "@/lib/dashboard-data";
import {
  firstTouch,
  recommendedAction,
  scoreBand,
  scoreLead,
  type ScoreBand,
  type ScoreInput,
  type TouchOrigin,
} from "@/lib/lead-score";
import { getPricing } from "@/lib/pricing-store";
import { statusOf } from "@/lib/status";

/**
 * Budget label for any stored BudgetRange. The floor-relative answers are
 * labelled from the resolved pricing (so they follow a price override); the
 * legacy fixed-currency values keep their registry label.
 */
export function budgetLabel(value: string, pricing: ResolvedPricing): string {
  const answer = budgetAnswerFromDb(value);
  if (answer) {
    const option = budgetOptionsView("en", pricing).find((o) => o.id === answer);
    if (option) return option.label;
  }
  return statusOf("budgetRange", value).label;
}

/** Everything scoreLead reads, from one client's records. */
export function scoreInputFor(client: {
  company: string | null;
  email: string | null;
  source: string;
  contactSubmission: {
    budget: string | null;
    projectTimeline: string | null;
    serviceInterest: string | null;
    message: string | null;
    situation: string | null;
    decisionRole: string | null;
    qualifiedAt: Date | null;
  } | null;
  transparencyLead: {
    timeline: string | null;
    priceMax: number;
    situation: string | null;
    nextStep: string | null;
  } | null;
  proposals: { readAt: Date | null }[];
  meetings: { status: string; scheduledDate: Date }[];
  inboundMessages: number;
}): ScoreInput {
  const sub = client.contactSubmission;
  const lead = client.transparencyLead;
  return {
    budget: sub?.budget ?? null,
    timeline: sub?.projectTimeline ?? null,
    estimatorTimeline: lead?.timeline ?? null,
    estimatorNextStep: lead?.nextStep ?? null,
    source: client.source,
    serviceInterest: sub?.serviceInterest ?? null,
    hasCompany: Boolean(client.company),
    hasEmail: Boolean(client.email),
    messageLength: sub?.message?.length ?? 0,
    estimatorPriceMax: client.transparencyLead?.priceMax ?? null,
    proposalCount: client.proposals.length,
    readProposal: Boolean(client.proposals[0]?.readAt),
    inboundMessages: client.inboundMessages,
    decisionRole: sub?.decisionRole ?? null,
    situation: sub?.situation ?? lead?.situation ?? null,
    qualified: Boolean(sub?.qualifiedAt),
    call: callState(client.meetings),
  };
}

export const SCORE_SUBMISSION_SELECT = {
  budget: true,
  projectTimeline: true,
  serviceInterest: true,
  message: true,
  situation: true,
  decisionRole: true,
  qualifiedAt: true,
} as const;

export interface PreCallBrief {
  current: string | null;
  change: string | null;
  stakes: string | null;
}

function readBrief(value: unknown): PreCallBrief | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const pick = (k: string) =>
    typeof v[k] === "string" && (v[k] as string).trim() ? (v[k] as string) : null;
  const brief = { current: pick("current"), change: pick("change"), stakes: pick("stakes") };
  return brief.current || brief.change || brief.stakes ? brief : null;
}

export interface PreCallView {
  clientId: string | null;
  score: number | null;
  reasons: string[];
  band: ScoreBand | null;
  action: string | null;
  stage: DerivedStage | null;
  owner: string | null;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  lostReason: string | null;
  lostNote: string | null;
  qualification: {
    /** ContactSubmission.serviceInterest as its admin label. */
    service: string | null;
    situation: string | null;
    budget: string | null;
    timeline: string | null;
    decisionRole: string | null;
    qualifiedAt: Date | null;
  } | null;
  meeting: {
    id: string;
    status: string;
    scheduledDate: Date;
    scheduledTime: string;
    brief: PreCallBrief | null;
    briefAt: Date | null;
  } | null;
  estimate: {
    min: number;
    max: number;
    /** "consultation" | "review"; null on a run stored before the read was kept. */
    nextStep: string | null;
    situation: string | null;
  } | null;
  attribution: {
    /** Which record the first touch came from. */
    origin: TouchOrigin;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrer: string | null;
    landingPath: string | null;
  } | null;
}

/**
 * The "Before the call" view, for a client or a submission. Reads only what
 * the records hold; every missing piece stays null so the block can say so.
 */
export async function loadPreCall(
  by: { clientId: string } | { submissionId: string },
): Promise<PreCallView | null> {
  const submission = await prisma.contactSubmission.findFirst({
    where:
      "submissionId" in by
        ? { id: by.submissionId }
        : { client: { id: by.clientId } },
    select: {
      id: true,
      ...SCORE_SUBMISSION_SELECT,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      referrer: true,
      landingPath: true,
      submittedAt: true,
      email: true,
      client: { select: { id: true } },
      meetings: {
        where: STAGE_MEETINGS_SELECT.meetings.where,
        select: STAGE_MEETINGS_SELECT.meetings.select,
      },
    },
  });
  const clientId =
    "clientId" in by ? by.clientId : (submission?.client?.id ?? null);

  const client = clientId
    ? await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          company: true,
          email: true,
          source: true,
          status: true,
          nextActionAt: true,
          nextActionNote: true,
          lostReason: true,
          lostNote: true,
          owner: { select: { name: true, email: true } },
          transparencyLead: {
            select: {
              timeline: true,
              priceMin: true,
              priceMax: true,
              situation: true,
              nextStep: true,
              createdAt: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
              referrer: true,
              landingPath: true,
            },
          },
          proposals: {
            select: { status: true, readAt: true },
            orderBy: { createdAt: "desc" },
          },
          contracts: { select: { status: true }, orderBy: { createdAt: "desc" } },
          projects: { where: { status: { not: "CANCELLED" } }, select: { status: true }, take: 1 },
          ...STAGE_MEETINGS_SELECT,
          _count: { select: { messages: { where: { direction: "INBOUND" } } } },
        },
      })
    : null;
  if (!submission && !client) return null;

  const meetingScope = [
    ...(clientId ? [{ clientId }] : []),
    ...(submission ? [{ submissionId: submission.id }] : []),
  ];
  const meeting = await prisma.meeting.findFirst({
    where: { OR: meetingScope, status: { notIn: ["CANCELLED", "REJECTED"] } },
    orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
    select: {
      id: true,
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      preCallBrief: true,
      preCallBriefAt: true,
    },
  });

  const pricing = await getPricing();
  const sub = submission;
  const lead = client?.transparencyLead ?? null;

  let score: number | null = null;
  let reasons: string[] = [];
  let band: ScoreBand | null = null;
  let stage: DerivedStage | null = null;
  if (client) {
    const scored = scoreLead(
      scoreInputFor({
        ...client,
        contactSubmission: sub
          ? {
              budget: sub.budget,
              projectTimeline: sub.projectTimeline,
              serviceInterest: sub.serviceInterest,
              message: sub.message,
              situation: sub.situation,
              decisionRole: sub.decisionRole,
              qualifiedAt: sub.qualifiedAt,
            }
          : null,
        inboundMessages: client._count.messages,
      }),
    );
    score = scored.score;
    reasons = scored.reasons;
    band = scoreBand(score, sub?.budget ?? null);
    stage = deriveClientStage(client);
  } else if (sub) {
    // Not converted yet: score what the submission alone says.
    const scored = scoreLead(
      scoreInputFor({
        company: null,
        email: sub.email,
        source: "WEBSITE_CONTACT_FORM",
        contactSubmission: sub,
        transparencyLead: null,
        proposals: [],
        meetings: sub.meetings,
        inboundMessages: 0,
      }),
    );
    score = scored.score;
    reasons = scored.reasons;
    band = scoreBand(score, sub.budget);
  }

  type Touch = {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrer: string | null;
    landingPath: string | null;
  };
  const touch = firstTouch<Touch>(
    sub ? { at: sub.submittedAt, record: sub } : null,
    lead ? { at: lead.createdAt, record: lead } : null,
  );
  return {
    clientId,
    score,
    reasons,
    band,
    action: band ? recommendedAction(band, stage ?? "NEW") : null,
    stage,
    owner: client?.owner ? client.owner.name || client.owner.email : null,
    nextActionAt: client?.nextActionAt ?? null,
    nextActionNote: client?.nextActionNote ?? null,
    lostReason: client?.lostReason ?? null,
    lostNote: client?.lostNote ?? null,
    qualification: sub
      ? {
          service: sub.serviceInterest
            ? statusOf("serviceType", sub.serviceInterest).label
            : null,
          situation: sub.situation,
          budget: sub.budget ? budgetLabel(sub.budget, pricing) : null,
          timeline: sub.projectTimeline,
          decisionRole: sub.decisionRole,
          qualifiedAt: sub.qualifiedAt,
        }
      : null,
    meeting: meeting
      ? {
          id: meeting.id,
          status: meeting.status,
          scheduledDate: meeting.scheduledDate,
          scheduledTime: meeting.scheduledTime,
          brief: readBrief(meeting.preCallBrief),
          briefAt: meeting.preCallBriefAt,
        }
      : null,
    estimate: lead
      ? {
          min: lead.priceMin,
          max: lead.priceMax,
          nextStep: lead.nextStep,
          situation: lead.situation,
        }
      : null,
    attribution: touch
      ? {
          origin: touch.origin,
          utmSource: touch.record.utmSource,
          utmMedium: touch.record.utmMedium,
          utmCampaign: touch.record.utmCampaign,
          referrer: touch.record.referrer,
          landingPath: touch.record.landingPath,
        }
      : null,
  };
}

/** Admin users who can own a lead, for the owner picker. */
export async function loadOwnerOptions(): Promise<{ id: string; label: string }[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, label: u.name || u.email }));
}

/** "YYYY-MM-DD" in local time, for the DateField. */
export function dayString(value: Date | null): string {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
