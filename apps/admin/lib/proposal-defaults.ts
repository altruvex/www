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

// Starting point for a new proposal's content. This is a SEED for the Admin
// form only — the generator never reads it. Once a proposal is saved, its
// stored content is the sole source of truth, so editing these defaults can
// never retroactively change a deck that has already been written.

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

// The deck's standing copy. Identical for every client out of the box —
// it lives in the content document so Ali can change a heading for one
// proposal without a deploy, not because it is expected to vary.
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

// The deck's furniture, exactly as the approved reference prints it.
// {date}, {weeks} and {n} are substituted at render time.
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

// Percentages and trigger wording both come from the schema, so a proposal,
// the contract generated from it and the public pricing page cannot disagree
// about the milestone split or about what the middle milestone is.
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

/**
 * `pricing` is the resolved set (override ?? default) the calling surface can
 * reach; the admin new-proposal page passes what `lib/pricing-store` resolved
 * so the seeded split and validity match the estimate beside them. Callers
 * with no datastore get the shipped defaults.
 */
export function buildDefaultProposalContent(
  input: DefaultContentInput,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): ProposalContent {
  const phases = getTimelinePhases(input.projectType, input.timelineWeeks);
  const scheduledWeeks = phases.reduce((sum, phase) => sum + phase.weeks, 0);
  // One load value per phase, sampled off the same curve the chart used to
  // hardcode. Admin can retune any of them afterwards.
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
    // Off by default: a discount is a deliberate act, never a starting state.
    discount: { ...NO_DISCOUNT },
    // Empty by default: a domain or hosting line is added when this client
    // actually needs one, with the price for that one registrar and term.
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
