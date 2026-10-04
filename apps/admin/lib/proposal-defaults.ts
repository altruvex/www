import {
  getPerformanceTargets,
  getProblems,
  getProgressTargets,
  getSolutionModules,
  getTimelinePhases,
  getWeeklyLoad,
  getDefaultLineItems,
  paymentTermText,
  paymentTriggers,
  projectTypeLabel,
  SCOPE_INCLUDED,
  SCOPE_NOT_INCLUDED,
  STANDARD_TERMS,
} from "./proposal-content";
import { NO_DISCOUNT, type ProposalContent } from "./proposal-schema";
import {
  DEFAULT_PRICING,
  type ResolvedPricing,
  type ServiceId,
} from "@repo/pricing-schema";

const DEFAULT_WHY_US = {
  headlineLine1: "We don't build templates.",
  headlineLine2: "We engineer systems.",
  paragraph:
    "Altruvex is a high-precision web engineering company. Every project is owned end-to-end: architecture, design, development, and delivery. You get a system built right the first time — not assembled from templates and plugins.",
  cta: "Ready to build the system your business deserves?",
  valueProps: [
    "Your platform reflects your brand identity precisely — no compromise.",
    "You own the system outright — no third-party dependency or platform subscription.",
    "Performance that converts — fast load, smooth UX, mobile-first.",
    "You own the codebase — no vendor lock-in, no platform risk.",
  ],
};

const DEFAULT_SECTIONS = {
  problems: {
    eyebrow: "02 — Project Understanding",
    lead: "Where things stand ",
    accent: "today.",
    intro:
      "Before proposing a solution, here's our read on the problem this project needs to solve.",
    quote:
      "\u201CGood engineering starts with an honest read of the problem — not a template.\u201D",
  },
  solution: { eyebrow: "03 — Proposed Solution", lead: "What we'll ", accent: "build." },
  timeline: { eyebrow: "04 — Timeline", lead: "How we'll ", accent: "get there." },
  investment: { eyebrow: "05 — Investment", lead: "What it ", accent: "costs." },
  scope: { eyebrow: "06 — Scope & Terms", lead: "What's ", accent: "included." },
  closing: { eyebrow: "07 — Why Altruvex", heading: "Why Altruvex" },
};

const DEFAULT_LABELS = {
  cover: {
    eyebrow: "ALTRUVEX · WEB ENGINEERING · PROJECT PROPOSAL · {date}",
    titleLine1: "Project",
    titleLine2: "Proposal.",
    preparedFor: "PREPARED FOR",
  },
  footerCompany: "Altruvex",
  performanceTargets: "PERFORMANCE TARGETS",
  weeklyLoad: "WEEKLY LOAD",
  weeklyLoadTick: "W{n}",
  timelineTotal:
    "Total: {weeks} weeks from kickoff to launch — assumes on-time content and feedback.",
  investmentItem: "ITEM",
  investmentAmount: "AMOUNT",
  investmentTotal: "TOTAL INVESTMENT",
  paymentSplit: "PAYMENT SPLIT",
  validUntil: "Valid until {date}",
  scopeIncluded: "INCLUDED",
  scopeNotIncluded: "NOT INCLUDED",
  keyTerms: "KEY TERMS",
  services: "RECURRING SERVICES",
  servicesNote: "Billed separately from the project fee, per term, at the price shown.",
};

const PAYMENT_LABELS = ["First Payment", "Second Payment", "Final Payment"] as const;

function defaultPaymentSchedule(pricing: ResolvedPricing) {
  const triggers = paymentTriggers(pricing);
  return PAYMENT_LABELS.map((label, i) => ({
    label,
    trigger: triggers[i] as string,
    percent: pricing.terms.paymentSplit[i] as number,
  }));
}

export interface DefaultContentInput {
  clientName: string;
  clientCompany: string;
  industry?: string | null;
  projectType: ServiceId;
  currency: string;
  totalPrice: number;
  timelineWeeks: number;
  proposalDate?: Date;
  validityDays?: number;
}

export function buildDefaultProposalContent(
  input: DefaultContentInput,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): ProposalContent {
  const phases = getTimelinePhases(input.projectType, input.timelineWeeks);
  const scheduledWeeks = phases.reduce((sum, phase) => sum + phase.weeks, 0);
  const load = getWeeklyLoad(phases.length);
  const date = input.proposalDate ?? new Date();

  return {
    meta: {
      clientName: input.clientName,
      clientCompany: input.clientCompany,
      projectLabel: `Custom ${input.industry?.trim() || projectTypeLabel(input.projectType)} Platform`,
      proposalDate: date.toISOString().slice(0, 10),
      validityDays: input.validityDays ?? pricing.terms.proposalValidityDays,
      currency: input.currency,
    },
    labels: { ...DEFAULT_LABELS, cover: { ...DEFAULT_LABELS.cover } },
    sections: {
      ...DEFAULT_SECTIONS,
      problems: { ...DEFAULT_SECTIONS.problems },
    },
    problems: getProblems(input.projectType).map((problem) => ({
      title: problem.title,
      description: problem.description,
    })),
    solutionModules: getSolutionModules(input.projectType).map((module) => ({
      title: module.title,
      description: module.description,
    })),
    performanceTargets: getPerformanceTargets().map((label) => ({ label })),
    performanceScores: getProgressTargets().map((target) => ({
      label: target.label,
      score: target.percent,
    })),
    timelinePhases: phases.map((phase, i) => ({
      name: phase.name,
      deliverable: phase.deliverable,
      durationLabel: `${phase.weeks}W`,
      weeklyLoad: load[i] ?? 50,
    })),
    investmentItems: getDefaultLineItems(input.totalPrice).map((item) => ({
      item: item.name,
      amount: item.amount,
    })),
    discount: { ...NO_DISCOUNT },
    services: [],
    paymentSchedule: defaultPaymentSchedule(pricing),
    scopeIncluded: [...SCOPE_INCLUDED],
    scopeNotIncluded: [...SCOPE_NOT_INCLUDED],
    keyTerms: STANDARD_TERMS.map(([label, value]) => ({
      label: label.charAt(0) + label.slice(1).toLowerCase(),
      value:
        label === "TIMELINE"
          ? `Starts after first payment + confirmed brief. ${scheduledWeeks} weeks to launch.`
          : label === "PAYMENT"
            ? paymentTermText(pricing)
            : label === "VALIDITY"
              ? `Proposal valid for ${pricing.terms.proposalValidityDays} days from the proposal date.`
              : value,
    })),
    whyUs: {
      ...DEFAULT_WHY_US,
      valueProps: [...DEFAULT_WHY_US.valueProps],
    },
  };
}
