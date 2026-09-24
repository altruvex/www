import {
  BRAND_IDENTITY_IDS,
  COMPLEXITY_IDS,
  CONTENT_READINESS_IDS,
  SERVICE_IDS,
  TIMELINE_IDS,
} from "@repo/pricing-schema";
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
    // Ids from @repo/pricing-schema, not free text: they select a price cell,
    // and the server recomputes the estimate from them (see the route).
    projectType: z.enum(SERVICE_IDS, { error: t("transparency-lead.projectType") }),
    complexity: z.enum(COMPLEXITY_IDS, { error: t("transparency-lead.complexity") }),
    timeline: z.enum(TIMELINE_IDS, { error: t("transparency-lead.timeline") }),
    // The two answers the estimator has always asked for and never kept.
    brandIdentity: z.enum(BRAND_IDENTITY_IDS).optional(),
    contentReadiness: z.enum(CONTENT_READINESS_IDS).optional(),
    // Accepted so an older client keeps working, and then ignored: the figures
    // stored on the lead are recomputed server-side from the answers above.
    // A number the visitor's browser chose is not an estimate this studio made.
    priceMin: z.number().int().min(0).optional(),
    priceMax: z.number().int().min(0).optional(),
    weeksMin: z.number().int().min(0).optional(),
    weeksMax: z.number().int().min(0).optional(),
  });
