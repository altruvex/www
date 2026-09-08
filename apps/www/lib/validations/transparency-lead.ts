import { z } from "zod";

import { normalizeNumeralsToEnglish } from "../utils/number";
type ValidationTranslator = (key: string) => string;

/**
 * Optional free-text field: an empty input arrives as `""`, which would
 * otherwise be stored as an empty string rather than left absent. Trim first,
 * then treat blank as missing, so the column stays honest about what the
 * visitor actually gave.
 */
const optionalText = (max: number, message?: string) =>
  z.preprocess(
    (val) => {
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    message
      ? z.string().max(max, message).optional()
      : z.string().max(max).optional(),
  );

export const createTransparencyLeadSchema = (t: ValidationTranslator) =>
  z.object({
    phone: z.preprocess(
      (val) =>
        typeof val === "string" ? normalizeNumeralsToEnglish(val) : val,
      z
        .string()
        .regex(
          /^(\+|00)?[1-9]\d{6,14}$|^01[0125]\d{8}$/,
          t("transparency-lead.phone"),
        ),
    ),
    name: optionalText(120, t("transparency-lead.name")),
    // Optional, and deliberately so: the CRM keys on phone (see
    // `linkClientToLead`), so email is enrichment rather than identity. A
    // blank field must not fail a submission that is otherwise valid.
    email: z.preprocess(
      (val) => {
        if (typeof val !== "string") return val;
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      },
      z.email(t("transparency-lead.email")).max(160).optional(),
    ),
    company: optionalText(160),
    projectType: z.string().min(1, t("transparency-lead.projectType")),
    complexity: z.string().min(1, t("transparency-lead.complexity")),
    timeline: z.string().min(1, t("transparency-lead.timeline")),
    // The two answers the estimator has always asked for and never kept.
    brandIdentity: optionalText(40),
    contentReadiness: optionalText(40),
    priceMin: z.number().int().min(0),
    priceMax: z.number().int().min(0),
    weeksMin: z.number().int().min(0),
    weeksMax: z.number().int().min(0),
  });
