import "server-only";
import {
  CalendarClock,
  CalendarPlus,
  CopyPlus,
  FileCheck2,
  FilePlus2,
  FileSignature,
  FileText,
  FolderKanban,
  FolderOpen,
  HandCoins,
  Handshake,
  History,
  ListPlus,
  MessageSquareText,
  PencilRuler,
  Receipt,
  RefreshCw,
  Repeat2,
  Send,
  SendHorizontal,
  Wrench,
} from "lucide-react";
import type { NextStep } from "@/components/os/next-steps";
import { roleCanOpen } from "@/lib/action-center";
import { date, money, when } from "@/lib/format";
import { canSeeFinance, type Role } from "@/lib/nav";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { deriveStatus } from "@/lib/subscription-lifecycle";
import type { ClientHub } from "./hub-data";

const LEAD_STAGES = ["NEW", "VIEWED", "CONTACTED", "QUALIFIED"];
const LIVE_PROPOSAL = ["SENT", "DELIVERED", "READ", "VIEWED"];
const LIVE_MEETING = ["PENDING", "APPROVED", "RESCHEDULED"];
const ENDED_RETAINER = ["CANCELLED", "EXPIRED"];

export interface ClientPlan {
  steps: NextStep[];
  generate: { proposalId: string; primary: boolean } | null;
}

export interface ProposalFollowUpInput {
  id: string;
  status: string;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
  respondedAt: Date | null;
  contract: unknown;
}

export function proposalFollowUp(
  proposal: ProposalFollowUpInput,
  clientId: string,
  role: Role | undefined,
  now: Date = new Date(),
): { kind: "send" | "reissue" | "open"; step: NextStep } | null {
  if (proposal.contract) return null;
  const live = LIVE_PROPOSAL.includes(proposal.status);
  const lapsed =
    proposal.status === "REJECTED" ||
    proposal.status === "EXPIRED" ||
    (live && proposal.validUntil.getTime() < now.getTime());
  if (proposal.status === "DRAFT") {
    if (!can(role, "send", "proposal") || !can(role, "view", "proposal")) {
      return null;
    }
    return {
      kind: "send",
      step: {
        key: "send-proposal",
        label: "Send the proposal",
        hint: `Drafted ${when(proposal.createdAt)}`,
        icon: SendHorizontal,
        href: `/proposals/${proposal.id}`,
      },
    };
  }
  if (lapsed) {
    if (!can(role, "create", "proposal")) return null;
    return {
      kind: "reissue",
      step: {
        key: "new-version",
        label: "New version",
        hint:
          proposal.status === "REJECTED"
            ? `Declined ${when(proposal.respondedAt ?? proposal.updatedAt)}`
            : `Expired ${date(proposal.validUntil)}`,
        icon: CopyPlus,
        href: `/clients/${clientId}/new-proposal?from=${proposal.id}`,
      },
    };
  }
  if (live && can(role, "view", "proposal")) {
    return {
      kind: "open",
      step: {
        key: "open-proposal",
        label: "Open the proposal",
        hint: proposal.readAt
          ? `Read ${when(proposal.readAt)}`
          : `Sent ${when(proposal.sentAt ?? proposal.createdAt)}`,
        icon: FileText,
        href: `/proposals/${proposal.id}`,
      },
    };
  }
  return null;
}

export function projectWorkSteps(
  project: { id: string; name: string; clientId: string },
  allowed: { task: boolean; change: boolean; charge: boolean },
): NextStep[] {
  const steps: NextStep[] = [];
  if (allowed.task) {
    steps.push({
      key: `task-${project.id}`,
      label: "Add a task",
      hint: project.name,
      icon: ListPlus,
      href: `/tasks?project=${project.id}&new=task`,
    });
  }
  if (allowed.change) {
    steps.push({
      key: `change-${project.id}`,
      label: "Request a change",
      hint: project.name,
      icon: PencilRuler,
      href: `/projects/${project.id}#changes`,
    });
  }
  if (allowed.charge) {
    steps.push({
      key: `charge-${project.id}`,
      label: "New charge",
      hint: project.name,
      icon: Receipt,
      href: `/payments?new=charge&client=${project.clientId}&project=${project.id}`,
    });
  }
  return steps;
}

export function planNextSteps(
  hub: ClientHub,
  role: Role | undefined,
  now: Date = new Date(),
): ClientPlan {
  const { client, stage, services, meetings } = hub;
  const name = client.company || client.name || "the client";
  const opens = (href: string) => roleCanOpen(role, href);
  const showMoney = canSeeFinance(role);

  const steps: NextStep[] = [];
  const leads: string[] = [];
  let generateId: string | null = null;

  function add(step: NextStep, lead = false) {
    if (!opens(step.href)) return;
    if (steps.some((s) => s.key === step.key)) return;
    steps.push(step);
    if (lead) leads.push(step.key);
  }

  const overdue = showMoney ? hub.payments.filter((p) => p.overdue) : [];
  if (can(role, "view", "payment")) {
    for (const p of overdue) {
      add(
        {
          key: `collect-${p.id}`,
          label: `Collect ${money(p.amount, p.currency)} overdue`,
          hint: `${statusOf("paymentMilestone", p.milestone).label} · was due ${date(p.dueDate)}`,
          icon: HandCoins,
          href: `/payments?inspect=${p.id}`,
        },
        true,
      );
    }
  }
  if (overdue.length > 0 && can(role, "view", "message")) {
    add({
      key: "message-overdue",
      label: `${name} on WhatsApp`,
      hint: `${overdue.length} payment${overdue.length === 1 ? "" : "s"} overdue`,
      icon: MessageSquareText,
      href: `/whatsapp/${client.id}`,
    });
  }

  for (const contract of client.contracts) {
    if (!can(role, "view", "contract")) break;
    if (contract.status === "DRAFT") {
      const canSend = can(role, "send", "contract");
      add(
        {
          key: `contract-${contract.id}`,
          label: canSend ? "Send the contract" : "Open the contract",
          hint: `Drafted ${when(contract.createdAt)}`,
          icon: canSend ? Send : FileSignature,
          href: `/contracts/${contract.id}`,
        },
        true,
      );
    } else if (contract.status === "SENT") {
      add(
        {
          key: `contract-${contract.id}`,
          label: "Open the contract",
          hint: `Not signed · created ${when(contract.createdAt)}`,
          icon: FileSignature,
          href: `/contracts/${contract.id}`,
        },
        true,
      );
    }
  }

  const acceptedWithoutContract = client.proposals.find(
    (p) => p.status === "ACCEPTED" && !p.contract,
  );
  if (acceptedWithoutContract && can(role, "create", "contract")) {
    generateId = acceptedWithoutContract.id;
    leads.push("generate");
  }

  const latestContract = client.contracts[0];
  if (
    latestContract &&
    (latestContract.status === "DECLINED" ||
      latestContract.status === "EXPIRED") &&
    can(role, "create", "proposal")
  ) {
    add(
      {
        key: "quote-again",
        label: "Quote again",
        hint: `Contract ${latestContract.status === "DECLINED" ? "declined" : "expired"} ${when(latestContract.updatedAt)}`,
        icon: Repeat2,
        href: `/clients/${client.id}/new-proposal?from=${latestContract.proposalId}`,
      },
      true,
    );
  }

  const latestProposal = client.proposals[0];
  if (latestProposal) {
    const next = proposalFollowUp(latestProposal, client.id, role, now);
    if (next) add(next.step, true);
  }

  const activeProjects = client.projects.filter((p) => p.status === "ACTIVE");
  if (
    latestContract?.status === "SIGNED" &&
    !latestContract.onboardingMessageSentAt &&
    can(role, "edit", "contract")
  ) {
    add(
      {
        key: "onboarding",
        label: "Record onboarding",
        hint: `Signed ${when(latestContract.signedAt ?? latestContract.updatedAt)}`,
        icon: Handshake,
        href: `/contracts/${latestContract.id}`,
      },
      stage === "SIGNED",
    );
  }
  for (const project of activeProjects) {
    if (can(role, "view", "project")) {
      add(
        {
          key: `project-${project.id}`,
          label: "Open the project",
          hint: project.name,
          icon: FolderKanban,
          href: `/projects/${project.id}`,
        },
        stage === "SIGNED",
      );
    }
    for (const step of projectWorkSteps(
      { id: project.id, name: project.name, clientId: client.id },
      {
        task: can(role, "create", "project"),
        change: can(role, "edit", "project"),
        charge: showMoney && can(role, "create", "payment"),
      },
    )) {
      add(step);
    }
  }
  if (stage === "SIGNED" && activeProjects.length === 0) {
    const project = client.projects[0];
    if (project && can(role, "view", "project")) {
      add(
        {
          key: `project-${project.id}`,
          label: "Open the project",
          hint: `${project.name} · ${statusOf("projectStatus", project.status).label}`,
          icon: FolderOpen,
          href: `/projects/${project.id}`,
        },
        true,
      );
    }
    if (latestContract?.status === "SIGNED" && can(role, "view", "contract")) {
      add(
        {
          key: `contract-${latestContract.id}`,
          label: "Open the contract",
          hint: `Signed ${when(latestContract.signedAt ?? latestContract.updatedAt)}`,
          icon: FileCheck2,
          href: `/contracts/${latestContract.id}`,
        },
        true,
      );
    }
  }

  for (const service of services) {
    if (!can(role, "edit", "project")) break;
    if (
      service.state === "expired" ||
      service.state === "urgent" ||
      service.state === "renewing-soon"
    ) {
      add(
        {
          key: `renew-${service.id}`,
          label: `Renew ${service.name}`,
          hint: service.expiresAt
            ? `${service.state === "expired" ? "Expired" : "Expires"} ${date(service.expiresAt)}`
            : "No expiry recorded",
          icon: RefreshCw,
          href: `/services?inspect=${service.id}`,
        },
        service.state !== "renewing-soon",
      );
    }
  }

  const isLead = LEAD_STAGES.includes(stage);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const upcoming = meetings
    .filter(
      (m) =>
        LIVE_MEETING.includes(m.status) &&
        m.scheduledDate.getTime() >= today.getTime(),
    )
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];
  if (upcoming && can(role, "view", "meeting")) {
    add(
      {
        key: "open-meeting",
        label: "Open the meeting",
        hint: `${date(upcoming.scheduledDate)} at ${upcoming.scheduledTime}`,
        icon: CalendarClock,
        href: `/calendar?meeting=${upcoming.id}`,
      },
      isLead,
    );
  }
  const scheduleStep: NextStep | null = can(role, "create", "meeting")
    ? {
        key: "schedule-meeting",
        label: "Schedule a meeting",
        hint: isLead ? "Still a lead" : undefined,
        icon: CalendarPlus,
        href: `/calendar?new=meeting&client=${client.id}`,
      }
    : null;
  const proposalStep: NextStep | null = can(role, "create", "proposal")
    ? {
        key: "new-proposal",
        label: "New proposal",
        hint: stage === "QUALIFIED" ? "Qualified, ready to quote" : undefined,
        icon: FilePlus2,
        href: `/clients/${client.id}/new-proposal`,
      }
    : null;
  const leadNeedsMeeting = isLead && stage !== "QUALIFIED" && !upcoming;
  if (stage === "QUALIFIED") {
    if (proposalStep) add(proposalStep, true);
    if (scheduleStep) add(scheduleStep);
  } else {
    if (scheduleStep) add(scheduleStep, leadNeedsMeeting);
  }

  const hasRetainer = client.subscriptions.some(
    (s) => !ENDED_RETAINER.includes(deriveStatus(s, now)),
  );
  if (
    (client.projects.length > 0 || stage === "SIGNED") &&
    !hasRetainer &&
    can(role, "create", "payment")
  ) {
    add({
      key: "start-retainer",
      label: "Start a retainer",
      hint: "No maintenance retainer yet",
      icon: Wrench,
      href: `/maintenance?new=retainer&client=${client.id}`,
    });
  }

  if (proposalStep) add(proposalStep, true);

  if (can(role, "create", "project") && roleCanOpen(role, "/projects")) {
    add({
      key: "record-project",
      label: "Record a past project",
      hint: "Built before this system — no contract behind it",
      icon: History,
      href: `/projects?new=recorded&client=${client.id}`,
    });
  }

  const primaryKey = leads[0];
  const ordered = steps.map((s) =>
    s.key === primaryKey ? { ...s, primary: true } : s,
  );
  ordered.sort(
    (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)),
  );

  return {
    steps: ordered,
    generate: generateId
      ? { proposalId: generateId, primary: primaryKey === "generate" }
      : null,
  };
}
