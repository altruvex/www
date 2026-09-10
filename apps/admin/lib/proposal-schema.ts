import { z } from "zod";

// The complete, per-client content of a proposal deck. Every string the
// generator renders comes from here — the generator itself holds no client
// content of its own. Shared by the Admin form and the server-side gate so
// the two can never disagree about what "valid" means.

const nonEmpty = (label: string, max = 400) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const percent = z
  .number()
  .refine((v) => Number.isFinite(v), "Must be a number")
  .refine((v) => v >= 0 && v <= 100, "Must be between 0 and 100");

/** At least one item, and every list stays reorderable in the Admin. */
const list = <T extends z.ZodTypeAny>(item: T, label: string) =>
  z.array(item).min(1, `${label} needs at least one item`);

export const proposalMetaSchema = z.object({
  clientName: nonEmpty("Client name", 160),
  clientCompany: nonEmpty("Client company", 160),
  projectLabel: nonEmpty("Project label", 160),
  proposalDate: z.string().min(1, "Proposal date is required"),
  validityDays: z.number().int().min(1).max(365),
  currency: nonEmpty("Currency", 8),
});

export const problemSchema = z.object({
  title: nonEmpty("Problem title", 160),
  description: nonEmpty("Problem description"),
});

export const solutionModuleSchema = z.object({
  title: nonEmpty("Module title", 160),
  description: nonEmpty("Module description"),
});

export const performanceTargetSchema = z.object({
  label: nonEmpty("Target label", 80),
});

export const performanceScoreSchema = z.object({
  label: nonEmpty("Score label", 80),
  score: percent,
});

export const timelinePhaseSchema = z.object({
  name: nonEmpty("Phase name", 120),
  deliverable: nonEmpty("Phase deliverable", 240),
  durationLabel: nonEmpty("Duration label", 16),
  // Drives the bar height on the weekly-load chart. Deliberately separate
  // from durationLabel: a one-week phase can still be the heaviest week.
  weeklyLoad: percent,
});

export const investmentItemSchema = z.object({
  item: nonEmpty("Investment item", 160),
  amount: z.number().int().min(0),
});

export const paymentScheduleSchema = z.object({
  label: nonEmpty("Payment label", 80),
  trigger: nonEmpty("Payment trigger", 240),
  percent,
  // No amount field by design — it is computed from the investment total at
  // render time so it can never drift from the items.
});

export const keyTermSchema = z.object({
  label: nonEmpty("Term label", 80),
  value: nonEmpty("Term value", 400),
});

/**
 * An optional reduction applied to the line-item subtotal.
 *
 * Deliberately NOT a negative investment item: a discount has to survive
 * every downstream reader (contract, payments, analytics) as a distinct
 * number, and an item with a minus sign in front of it would be summed into
 * the subtotal it is supposed to reduce.
 *
 * `mode` is the discriminator rather than a nullable object so that turning a
 * discount off keeps the operator's last percentage and label — switching to
 * "none" hides it from every surface without erasing what was typed.
 */
export const discountSchema = z.object({
  mode: z.enum(["none", "percent", "amount"]),
  /** Percent of subtotal when mode is "percent"; absolute money when "amount". */
  value: z
    .number()
    .refine((v) => Number.isFinite(v), "Must be a number")
    .refine((v) => v >= 0, "Cannot be negative"),
  label: z.string().trim().max(80),
  /** Internal note — never printed in the deck. */
  reason: z.string().trim().max(240),
});

export const whyUsSchema = z.object({
  headlineLine1: nonEmpty("Headline line 1", 160),
  headlineLine2: nonEmpty("Headline line 2", 160),
  paragraph: nonEmpty("Why-us paragraph", 900),
  valueProps: list(nonEmpty("Value prop", 240), "Value props"),
  cta: nonEmpty("CTA question", 200),
});

// A section's standing copy: the mono eyebrow, and the heading split into
// its bold lead-in and the one Georgia-italic accent word. The split is the
// design — the accent word is a separate field so it can never be lost by
// someone editing the heading as one string.
export const sectionHeadingSchema = z.object({
  eyebrow: nonEmpty("Section eyebrow", 80),
  lead: nonEmpty("Heading lead-in", 120),
  accent: nonEmpty("Heading accent word", 60),
});

export const sectionsSchema = z.object({
  problems: sectionHeadingSchema.extend({
    intro: nonEmpty("Problems intro", 400),
    quote: nonEmpty("Problems quote", 400),
  }),
  solution: sectionHeadingSchema,
  timeline: sectionHeadingSchema,
  investment: sectionHeadingSchema,
  scope: sectionHeadingSchema,
  // The closing slide's heading carries no accent word — its accent line is
  // whyUs.headlineLine2.
  closing: z.object({
    eyebrow: nonEmpty("Section eyebrow", 80),
    heading: nonEmpty("Closing heading", 120),
  }),
});

/**
 * A label that must keep a placeholder, because the generator substitutes a
 * computed value into it. Rewording is free; dropping the token would
 * silently delete the number from the slide, so the schema refuses it.
 */
const templateLabel = (label: string, token: string, max = 240) =>
  nonEmpty(label, max).refine(
    (value) => value.includes(token),
    `${label} must contain ${token}`,
  );

// Fixed chrome: the column headers, block labels and cover wording. These
// are the document's furniture rather than its argument, so they default to
// the same strings for every client — but they live here so changing one
// never needs a deploy.
export const labelsSchema = z.object({
  cover: z.object({
    eyebrow: templateLabel("Cover eyebrow", "{date}", 160),
    titleLine1: nonEmpty("Cover title line 1", 60),
    titleLine2: nonEmpty("Cover title line 2", 60),
    preparedFor: nonEmpty("Prepared-for label", 60),
  }),
  footerCompany: nonEmpty("Footer company", 60),
  performanceTargets: nonEmpty("Performance targets label", 60),
  weeklyLoad: nonEmpty("Weekly load label", 60),
  weeklyLoadTick: templateLabel("Weekly load tick", "{n}", 8),
  timelineTotal: templateLabel("Timeline total line", "{weeks}"),
  investmentItem: nonEmpty("Item column", 40),
  investmentAmount: nonEmpty("Amount column", 40),
  investmentTotal: nonEmpty("Total row label", 60),
  paymentSplit: nonEmpty("Payment split label", 60),
  validUntil: templateLabel("Valid-until line", "{date}", 120),
  scopeIncluded: nonEmpty("Included column", 40),
  scopeNotIncluded: nonEmpty("Not-included column", 40),
  keyTerms: nonEmpty("Key terms label", 40),
});

export const proposalContentSchema = z
  .object({
    meta: proposalMetaSchema,
    labels: labelsSchema,
    sections: sectionsSchema,
    problems: list(problemSchema, "Problems"),
    solutionModules: list(solutionModuleSchema, "Solution modules"),
    performanceTargets: list(performanceTargetSchema, "Performance targets"),
    performanceScores: list(performanceScoreSchema, "Performance scores"),
    timelinePhases: list(timelinePhaseSchema, "Timeline phases"),
    investmentItems: list(investmentItemSchema, "Investment items"),
    // Proposals written before discounts existed carry no `discount` key.
    // Defaulting here (rather than at each read site) means every consumer —
    // the deck, the contract, the detail pages — sees the same shape.
    discount: discountSchema.default({ mode: "none", value: 0, label: "Discount", reason: "" }),
    paymentSchedule: list(paymentScheduleSchema, "Payment schedule"),
    scopeIncluded: list(nonEmpty("Scope item", 240), "Scope included"),
    scopeNotIncluded: list(nonEmpty("Scope item", 240), "Scope not included"),
    keyTerms: list(keyTermSchema, "Key terms"),
    whyUs: whyUsSchema,
  })
  .superRefine((content, ctx) => {
    // Percentages must land on exactly 100 — anything else silently
    // misstates what the client owes.
    const total = content.paymentSchedule.reduce((sum, row) => sum + row.percent, 0);
    if (Math.abs(total - 100) > 0.001) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentSchedule"],
        message: `Payment percentages must total 100% (currently ${formatPercent(total)}%)`,
      });
    }

    // A discount that is switched on but says nothing, or that wipes out the
    // whole fee, produces a deck nobody meant to send.
    const { discount } = content;
    if (discount.mode !== "none") {
      if (!discount.label.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["discount", "label"],
          message: "A discount that is shown to the client needs a label",
        });
      }
      if (!(discount.value > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["discount", "value"],
          message: "Set a discount above zero, or switch the discount off",
        });
      }
      if (discount.mode === "percent" && discount.value > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["discount", "value"],
          message: "A percentage discount cannot exceed 100%",
        });
      }
      const subtotal = investmentTotal(content.investmentItems);
      if (discount.mode === "amount" && discount.value > subtotal) {
        ctx.addIssue({
          code: "custom",
          path: ["discount", "value"],
          message: "The discount is larger than the line-item subtotal",
        });
      }
      if (subtotal > 0 && netTotal(content.investmentItems, discount) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["discount", "value"],
          message: "The discount leaves nothing to invoice",
        });
      }
    }
  });

export type ProposalMeta = z.infer<typeof proposalMetaSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type SolutionModule = z.infer<typeof solutionModuleSchema>;
export type PerformanceTarget = z.infer<typeof performanceTargetSchema>;
export type PerformanceScore = z.infer<typeof performanceScoreSchema>;
export type TimelinePhase = z.infer<typeof timelinePhaseSchema>;
export type InvestmentItem = z.infer<typeof investmentItemSchema>;
export type PaymentScheduleRow = z.infer<typeof paymentScheduleSchema>;
export type KeyTerm = z.infer<typeof keyTermSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type WhyUs = z.infer<typeof whyUsSchema>;
export type SectionHeading = z.infer<typeof sectionHeadingSchema>;
export type ProposalSections = z.infer<typeof sectionsSchema>;
export type ProposalLabels = z.infer<typeof labelsSchema>;
export type ProposalContent = z.infer<typeof proposalContentSchema>;

export interface CompanyDetails {
  phone: string;
  email: string;
  website: string;
  brandColor: string;
  brandColorDark: string;
}

/** Trims trailing zeros so "100" reads as 100, not 100.00. */
export function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

export function investmentTotal(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

/** No discount at all — the shape every pre-discount proposal reads back as. */
export const NO_DISCOUNT: Discount = {
  mode: "none",
  value: 0,
  label: "Discount",
  reason: "",
};

/**
 * What the discount is actually worth in money.
 *
 * Clamped to [0, subtotal] on the way out so no consumer can ever be handed a
 * negative fee or a reduction bigger than the thing it reduces — the schema
 * rejects those, but the deck, the contract and the payment rows all read
 * this and none of them should have to re-check.
 */
export function discountAmount(
  items: { amount: number }[],
  discount: Discount | null | undefined,
): number {
  if (!discount || discount.mode === "none") return 0;
  const subtotal = investmentTotal(items);
  const raw =
    discount.mode === "percent" ? (subtotal * discount.value) / 100 : discount.value;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.round(raw), subtotal);
}

/**
 * The number the client actually pays, and the number stored on the Proposal
 * row. Everything downstream — contract value, VAT, milestone payments,
 * pipeline value, analytics — is the NET figure, never the subtotal.
 */
export function netTotal(
  items: { amount: number }[],
  discount: Discount | null | undefined,
): number {
  return investmentTotal(items) - discountAmount(items, discount);
}

/**
 * The one place a payment amount is ever produced. Never stored — a stored
 * amount goes stale the moment an investment item or the discount changes.
 * Takes the content rather than the items so a caller cannot quietly bill the
 * pre-discount figure.
 */
export function paymentAmount(
  content: { investmentItems: { amount: number }[]; discount?: Discount | null },
  rowPercent: number,
): number {
  return Math.round((netTotal(content.investmentItems, content.discount) * rowPercent) / 100);
}

/**
 * Re-price the line items so their subtotal is exactly `target`, keeping each
 * item's share of the total.
 *
 * This is what the price control writes: the operator names a number, and the
 * table underneath it stays internally consistent instead of being overridden
 * by a single figure that no longer matches its own rows. Items are rounded to
 * `rounding` and the remainder lands on the largest item, so the sum is exact
 * rather than approximately right.
 */
export function rescaleInvestmentItems<T extends { amount: number }>(
  items: T[],
  target: number,
  rounding = 500,
): T[] {
  if (items.length === 0) return items;
  const safeTarget = Math.max(0, Math.round(target));
  const current = investmentTotal(items);

  // With nothing to scale from, an even split is the only honest guess.
  const shares =
    current > 0
      ? items.map((item) => item.amount / current)
      : items.map(() => 1 / items.length);

  const step = Math.max(1, Math.round(rounding));
  const scaled = items.map((item, i) => ({
    ...item,
    amount: Math.max(0, Math.round((safeTarget * shares[i]) / step) * step),
  }));

  // Rounding leaves a remainder; put it on the biggest row, where it is the
  // smallest proportional lie.
  const drift = safeTarget - investmentTotal(scaled);
  if (drift !== 0) {
    let biggest = 0;
    for (let i = 1; i < scaled.length; i += 1) {
      if (scaled[i].amount > scaled[biggest].amount) biggest = i;
    }
    scaled[biggest] = {
      ...scaled[biggest],
      amount: Math.max(0, scaled[biggest].amount + drift),
    };
  }
  return scaled;
}

export function paymentPercentTotal(rows: { percent: number }[]): number {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.percent) ? row.percent : 0), 0);
}

/** "Valid until" date, derived from the proposal date + validity window. */
export function validUntilDate(meta: {
  proposalDate: string;
  validityDays: number;
}): Date {
  const start = new Date(meta.proposalDate);
  const end = new Date(start);
  end.setDate(end.getDate() + meta.validityDays);
  return end;
}

/**
 * The one spelling of a date in a proposal. The deck used to format inline and
 * the editor showed nothing at all, so an operator setting "30 days" could not
 * see the date the client would read.
 */
export function formatDocDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Estimated delivery: the proposal date plus the timeline's own total weeks.
 * Derived, never stored — a stored date drifts the moment a phase is edited.
 */
export function deliveryDate(proposalDate: string, weeks: number): Date {
  const end = new Date(proposalDate);
  end.setDate(end.getDate() + Math.round(weeks * 7));
  return end;
}

/** Fills {token} placeholders in a label. */
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (out, [token, value]) => out.split(`{${token}}`).join(String(value)),
    template,
  );
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Flattens Zod issues into something both the form and the API can render. */
export function validateProposalContent(value: unknown): {
  ok: boolean;
  content?: ProposalContent;
  issues: ValidationIssue[];
} {
  const result = proposalContentSchema.safeParse(value);
  if (result.success) return { ok: true, content: result.data, issues: [] };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
