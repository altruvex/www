import {
  pricingCopy,
  type ComplexityId,
  type ServiceId,
} from "@repo/pricing-schema";

export interface ProblemCard {
  title: string;
  description: string;
}

export interface SolutionModule {
  title: string;
  description: string;
}

export interface TimelinePhase {
  name: string;
  deliverable: string;
  weeks: number;
}

export interface LineItem {
  name: string;
  amount: number;
}

const PROBLEMS: Record<ServiceId, ProblemCard[]> = {
  website: [
    { title: "Outdated brand presence", description: "The current site undersells the business and erodes trust before the first conversation happens." },
    { title: "No lead capture system", description: "Interested visitors have no clear, fast path to becoming a qualified conversation." },
    { title: "Poor mobile performance", description: "Slow loads and cramped layouts push away the majority of traffic before it reads a word." },
  ],
  webapp: [
    { title: "Manual, error-prone workflows", description: "Core operations still run through spreadsheets and ad-hoc tools that don't scale with the team." },
    { title: "No centralized system of record", description: "Data lives in disconnected places, so decisions are made on stale or incomplete information." },
    { title: "Operations can't scale", description: "Every new client or process adds manual overhead instead of running through the system." },
  ],
  ecommerce: [
    { title: "Lost sales at checkout", description: "Friction in the buying flow is costing conversions the business never sees in analytics." },
    { title: "Inventory out of sync", description: "Stock, pricing, and orders aren't unified across channels, creating fulfillment errors." },
    { title: "Can't compete on speed", description: "Slow product pages and checkout push price-sensitive shoppers to faster competitors." },
  ],
  pwa: [
    { title: "App-store friction", description: "Users drop off before an install prompt ever converts them into an active customer." },
    { title: "No offline experience", description: "Connectivity gaps turn into lost sessions instead of a resilient, always-available product." },
    { title: "Inconsistent cross-device experience", description: "The experience degrades depending on device and browser, undermining trust in the product." },
  ],
};

const SOLUTIONS: Record<ServiceId, SolutionModule[]> = {
  website: [
    { title: "Brand-precise design system", description: "A custom visual language built around the business, not a theme." },
    { title: "Conversion-focused architecture", description: "Every page engineered around a single, clear next action." },
    { title: "Performance engineering", description: "Sub-2-second loads on real-world mobile connections." },
    { title: "Bilingual-ready content layer", description: "Structured for AR/EN from day one, not retrofitted later." },
  ],
  webapp: [
    { title: "Custom data model", description: "A system of record purpose-built around how the business actually operates." },
    { title: "Role-based access", description: "The right people see the right data — nothing more, nothing less." },
    { title: "Automated workflows", description: "The manual steps that don't need a human anymore, removed." },
    { title: "Integration layer", description: "Connects cleanly to the tools already in use — no duplicate data entry." },
  ],
  ecommerce: [
    { title: "Frictionless checkout", description: "A buying flow engineered to convert, not just to function." },
    { title: "Unified inventory", description: "One source of truth for stock and pricing across every channel." },
    { title: "Payment & fulfillment integration", description: "Connected end-to-end so orders never fall through the cracks." },
    { title: "Merchandising controls", description: "Full control over catalog, promotions, and product presentation." },
  ],
  pwa: [
    { title: "Installable, app-like shell", description: "Native-grade interactions delivered straight from the browser." },
    { title: "Offline-first data layer", description: "Core functionality keeps working when connectivity doesn't." },
    { title: "Push notifications", description: "Re-engagement without an app-store gatekeeper in the way." },
    { title: "Cross-device consistency", description: "One codebase, one experience, every screen size." },
  ],
};

const PERFORMANCE_TARGETS = ["<2S LOAD TIME", "95+ LIGHTHOUSE SCORE", "100% MOBILE RESPONSIVE"];

const PROGRESS_TARGETS: { label: string; percent: number }[] = [
  { label: "Performance", percent: 95 },
  { label: "Accessibility", percent: 90 },
  { label: "SEO Readiness", percent: 100 },
];

// Phase allocation as a share of the total timeline — same structure
// regardless of project type, only the deliverable copy varies.
const PHASE_SHARE: { name: string; share: number }[] = [
  { name: "Discovery", share: 0.1 },
  { name: "Design", share: 0.2 },
  { name: "Development", share: 0.45 },
  { name: "QA & Testing", share: 0.15 },
  { name: "Staging Review", share: 0.05 },
  { name: "Launch", share: 0.05 },
];

const PHASE_DELIVERABLES: Record<ServiceId, string[]> = {
  website: [
    "Brief confirmed, sitemap locked",
    "Full visual design, all pages",
    "Built, responsive, bilingual-ready",
    "Cross-browser and device testing",
    "Client review on live staging URL",
    "Domain live, monitoring in place",
  ],
  webapp: [
    "Brief confirmed, model drafted",
    "UI/UX design across all core flows",
    "Core system built and integrated",
    "Functional and regression testing",
    "Client review on live staging URL",
    "Domain live, monitoring in place",
  ],
  ecommerce: [
    "Brief confirmed, structure set",
    "Storefront and checkout design",
    "Store built, payments integrated",
    "Order flow and payment testing",
    "Client review on live staging URL",
    "Domain live, monitoring in place",
  ],
  pwa: [
    "Brief confirmed, strategy set",
    "App-shell and interaction design",
    "Built, installable, offline-tested",
    "Cross-device and connectivity testing",
    "Client review on live staging URL",
    "Domain live, monitoring in place",
  ],
};

export function getProblems(projectType: ServiceId): ProblemCard[] {
  return PROBLEMS[projectType];
}

export function getSolutionModules(projectType: ServiceId): SolutionModule[] {
  return SOLUTIONS[projectType];
}

export function getPerformanceTargets(): string[] {
  return PERFORMANCE_TARGETS;
}

export function getProgressTargets(): { label: string; percent: number }[] {
  return PROGRESS_TARGETS;
}

export function getTimelinePhases(
  projectType: ServiceId,
  totalWeeks: number,
): TimelinePhase[] {
  const deliverables = PHASE_DELIVERABLES[projectType];
  const rawWeeks = PHASE_SHARE.map((phase) => phase.share * totalWeeks);
  const floored = rawWeeks.map((w) => Math.max(1, Math.floor(w)));
  let remainder = totalWeeks - floored.reduce((sum, w) => sum + w, 0);

  // Distribute leftover weeks to the phases with the largest fractional
  // remainder first, so the phases always sum to exactly totalWeeks.
  const byFracDesc = rawWeeks
    .map((w, i) => ({ i, frac: w - Math.floor(w) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of byFracDesc) {
    if (remainder <= 0) break;
    floored[i]++;
    remainder--;
  }

  // The Math.max(1, ...) floor above can push the total *past* totalWeeks
  // for a short timeline (many phases each rounding up to a 1-week
  // minimum) — remainder goes negative. Claw the excess back from the
  // phases with the weakest claim to their current week (smallest
  // fractional share first), never below the 1-week floor, so every
  // timeline always sums to exactly totalWeeks instead of silently
  // drifting over it.
  const byFracAsc = [...byFracDesc].reverse();
  for (const { i } of byFracAsc) {
    if (remainder >= 0) break;
    if (floored[i] <= 1) continue;
    floored[i]--;
    remainder++;
  }

  return PHASE_SHARE.map((phase, i) => ({
    name: phase.name,
    deliverable: deliverables[i],
    weeks: floored[i],
  }));
}

// Effort curve across the project's weeks, as a percentage of peak load:
// slow start, peak during build, taper into launch. The reference deck's
// six-week chart IS this profile; other durations resample it, so the shape
// holds instead of every bar rendering at one constant height.
const WEEKLY_LOAD_PROFILE = [30, 60, 100, 75, 45, 35];

export function getWeeklyLoad(totalWeeks: number): number[] {
  const weeks = Math.max(1, Math.floor(totalWeeks));
  if (weeks === 1) return [WEEKLY_LOAD_PROFILE[2]];

  const lastIndex = WEEKLY_LOAD_PROFILE.length - 1;
  return Array.from({ length: weeks }, (_, i) => {
    const pos = (i / (weeks - 1)) * lastIndex;
    const low = Math.floor(pos);
    const high = Math.min(lastIndex, low + 1);
    const t = pos - low;
    const value =
      WEEKLY_LOAD_PROFILE[low] * (1 - t) + WEEKLY_LOAD_PROFILE[high] * t;
    return Math.round(value);
  });
}

const LINE_ITEM_SPLIT: { name: string; share: number }[] = [
  { name: "Design & Brand System", share: 0.25 },
  { name: "Development & Engineering", share: 0.55 },
  { name: "QA, Launch & Handover", share: 0.1 },
  { name: "Project Management", share: 0.1 },
];

/** Default line-item breakdown for a total price — the calculator's
 * starting point; Ali edits amounts/names before generating (§5.1 rule 3). */
export function getDefaultLineItems(totalPrice: number): LineItem[] {
  const rounding = 500;
  const items = LINE_ITEM_SPLIT.map((item) => ({
    name: item.name,
    amount: Math.round((item.share * totalPrice) / rounding) * rounding,
  }));

  const sum = items.reduce((total, item) => total + item.amount, 0);
  const drift = totalPrice - sum;
  if (drift !== 0) {
    items[items.length - 1].amount += drift;
  }

  return items;
}

export function projectTypeLabel(projectType: ServiceId): string {
  return pricingCopy("en").services[projectType].documentName;
}

export function complexityLabel(complexity: ComplexityId): string {
  return pricingCopy("en").bands[complexity];
}

export const CONTACT = {
  phone: "+20 102 312 5493",
  email: "hello@altruvex.com",
  website: "altruvex.com",
};

// Shared between the proposal (slide 6) and the contract (SOW clause) so the
// two documents never quote different scope for the same deal.
export const SCOPE_INCLUDED = [
  "Custom design & development",
  "Responsive, mobile-first build",
  "Bilingual-ready content layer",
  "Domain, SSL & Year 1 hosting setup",
  "3 rounds of revisions",
  "30 days post-launch support",
];

export const SCOPE_NOT_INCLUDED = [
  "Branding from scratch",
  "Copywriting",
  "Paid stock / premium assets",
  "SMS / email credits",
  "Third-party subscriptions",
  "Ongoing retainer (quoted separately)",
];

export const STANDARD_TERMS: [string, string][] = [
  ["VALIDITY", "Proposal valid for 30 days from the proposal date."],
  ["PAYMENT", "50% to start · 30% at milestone · 20% before launch. No deposit = no project start."],
  ["TIMELINE", "Starts after first payment + confirmed brief."],
  ["LAUNCH", "Client reviews on Altruvex staging; live domain pointed after final payment."],
  ["CONTENT", "Client provides all text, images, brand assets, and access credentials."],
  ["REVISIONS", "3 rounds included. Additional at 800 EGP/hr."],
  ["OWNERSHIP", "Full source code ownership transfers to client upon final payment."],
  ["SUPPORT", "30 days of post-launch support for critical fixes included."],
];
