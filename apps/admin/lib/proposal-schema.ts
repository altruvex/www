import { consultingCreditIn, type Currency } from "@repo/pricing-schema";
import { z } from "zod";

import { CLIENT_SERVICE_KINDS } from "./service-lifecycle";

const nonEmpty = (label: string, max = 400) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const percent = z
  .number()
  .refine((v) => Number.isFinite(v), "Must be a number")
  .refine((v) => v >= 0 && v <= 100, "Must be between 0 and 100");

export const MAX_PROPOSAL_SERVICES = 6;

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
});

export const keyTermSchema = z.object({
  label: nonEmpty("Term label", 80),
  value: nonEmpty("Term value", 400),
});

export const discountSchema = z.object({
  mode: z.enum(["none", "percent", "amount"]),
  kind: z.enum(["manual", "audit-credit"]).default("manual"),
  value: z
    .number()
    .refine((v) => Number.isFinite(v), "Must be a number")
    .refine((v) => v >= 0, "Cannot be negative"),
  label: z.string().trim().max(80),
  reason: z.string().trim().max(240),
});

export const proposalServiceSchema = z.object({
  kind: z.enum(CLIENT_SERVICE_KINDS),
  name: nonEmpty("Service name", 120),
  provider: z.string().trim().max(80).default(""),
  termMonths: z
    .number()
    .int("Term must be whole months")
    .min(1, "Term must be at least one month")
    .max(120, "Term cannot exceed ten years")
    .nullable(),
  firstTermIncluded: z.boolean().default(false),
  price: z
    .number()
    .int("Price must be a whole amount")
    .min(1, "Set the renewal price the client pays per term"),
});

export const whyUsSchema = z.object({
  headlineLine1: nonEmpty("Headline line 1", 160),
  headlineLine2: nonEmpty("Headline line 2", 160),
  paragraph: nonEmpty("Why-us paragraph", 900),
  valueProps: list(nonEmpty("Value prop", 240), "Value props"),
  cta: nonEmpty("CTA question", 200),
});

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
  closing: z.object({
    eyebrow: nonEmpty("Section eyebrow", 80),
    heading: nonEmpty("Closing heading", 120),
  }),
});

const templateLabel = (label: string, token: string, max = 240) =>
  nonEmpty(label, max).refine(
    (value) => value.includes(token),
    `${label} must contain ${token}`,
  );

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
  services: nonEmpty("Services block label", 60).default("RECURRING SERVICES"),
  servicesNote: nonEmpty("Services note", 200).default(
    "Billed separately from the project fee, per term, at the price shown.",
  ),
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
    discount: discountSchema.default({ mode: "none", kind: "manual", value: 0, label: "Discount", reason: "" }),
    services: z
      .array(proposalServiceSchema)
      .max(MAX_PROPOSAL_SERVICES, `A proposal can list at most ${MAX_PROPOSAL_SERVICES} services`)
      .default([]),
    paymentSchedule: list(paymentScheduleSchema, "Payment schedule"),
    scopeIncluded: list(nonEmpty("Scope item", 240), "Scope included"),
    scopeNotIncluded: list(nonEmpty("Scope item", 240), "Scope not included"),
    keyTerms: list(keyTermSchema, "Key terms"),
    whyUs: whyUsSchema,
  })
  .superRefine((content, ctx) => {
    const total = content.paymentSchedule.reduce((sum, row) => sum + row.percent, 0);
    if (Math.abs(total - 100) > 0.001) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentSchedule"],
        message: `Payment percentages must total 100% (currently ${formatPercent(total)}%)`,
      });
    }

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
      if (discount.kind === "audit-credit") {
        const credit = auditCreditFor(content.meta.currency);
        if (credit === null) {
          ctx.addIssue({
            code: "custom",
            path: ["discount", "kind"],
            message: `The audit credit has no published figure in ${content.meta.currency} — quote this engagement in EGP or apply the reduction by hand`,
          });
        } else if (discount.mode !== "amount" || discount.value !== credit) {
          ctx.addIssue({
            code: "custom",
            path: ["discount", "value"],
            message: `The audit credit is ${credit.toLocaleString("en-US")} ${content.meta.currency} — re-apply it rather than editing the figure`,
          });
        }
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

export type Problem = z.infer<typeof problemSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type ProposalService = z.infer<typeof proposalServiceSchema>;
export type ProposalContent = z.infer<typeof proposalContentSchema>;

export interface CompanyDetails {
  phone: string;
  email: string;
  website: string;
  brandColor: string;
  brandColorDark: string;
}

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

export function investmentTotal(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

export const NO_DISCOUNT: Discount = {
  mode: "none",
  kind: "manual",
  value: 0,
  label: "Discount",
  reason: "",
};

export const AUDIT_CREDIT_LABEL = "Technical Audit credit";

export function auditCreditFor(currency: string): number | null {
  return consultingCreditIn(currency as Currency);
}

export function auditCreditDiscount(currency: string): Discount | null {
  const amount = auditCreditFor(currency);
  if (amount === null) return null;
  return {
    mode: "amount",
    kind: "audit-credit",
    value: amount,
    label: AUDIT_CREDIT_LABEL,
    reason: "Technical Audit fee credited against the build (published rule).",
  };
}

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

export function netTotal(
  items: { amount: number }[],
  discount: Discount | null | undefined,
): number {
  return investmentTotal(items) - discountAmount(items, discount);
}

export function paymentAmount(
  content: { investmentItems: { amount: number }[]; discount?: Discount | null },
  rowPercent: number,
): number {
  return Math.round((netTotal(content.investmentItems, content.discount) * rowPercent) / 100);
}

export function rescaleInvestmentItems<T extends { amount: number }>(
  items: T[],
  target: number,
  rounding = 500,
): T[] {
  if (items.length === 0) return items;
  const safeTarget = Math.max(0, Math.round(target));
  const current = investmentTotal(items);

  const shares =
    current > 0
      ? items.map((item) => item.amount / current)
      : items.map(() => 1 / items.length);

  const step = Math.max(1, Math.round(rounding));
  const scaled = items.map((item, i) => ({
    ...item,
    amount: Math.max(0, Math.round((safeTarget * shares[i]) / step) * step),
  }));

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

export function validUntilDate(meta: {
  proposalDate: string;
  validityDays: number;
}): Date {
  const start = new Date(meta.proposalDate);
  const end = new Date(start);
  end.setDate(end.getDate() + meta.validityDays);
  return end;
}

export function formatDocDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function deliveryDate(proposalDate: string, weeks: number): Date {
  const end = new Date(proposalDate);
  end.setDate(end.getDate() + Math.round(weeks * 7));
  return end;
}

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
