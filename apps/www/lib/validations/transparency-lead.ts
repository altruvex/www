import {
  BRAND_IDENTITY_IDS,
  COMPLEXITY_IDS,
  CONTENT_READINESS_IDS,
  SCOPE_NOTE_IDS,
  SERVICE_IDS,
  TIMELINE_IDS,
} from "@repo/pricing-schema";
import { z } from "zod";

import { isValidPhone, normalizePhone } from "../utils/transparency-utils";

type ValidationTranslator = (key: string) => string;

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

const emptyToUndefined = (val: unknown) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  return trimmed === "" ? undefined : trimmed;
};

// How the estimate reaches the visitor: an email, a WhatsApp number, or both.
// One shape for the form (client) and the route (server), so both refuse the
// same input with the same validation key.
const contactShape = (t: ValidationTranslator) => ({
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: t("transparency-lead.phone") })
      .refine(isValidPhone, { error: t("transparency-lead.phone") })
      .transform(normalizePhone)
      .optional(),
  ),
  email: z.preprocess(
    emptyToUndefined,
    z.email(t("transparency-lead.email")).max(160).optional(),
  ),
});

const requireOneContact =
  (t: ValidationTranslator) =>
  (value: { phone?: string; email?: string }, ctx: z.RefinementCtx) => {
    if (value.phone || value.email) return;
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: t("transparency-lead.contactRequired"),
    });
  };

export const createEstimateContactSchema = (t: ValidationTranslator) =>
  z.object(contactShape(t)).superRefine(requireOneContact(t));

export const createTransparencyLeadSchema = (t: ValidationTranslator) =>
  z
    .object({
      ...contactShape(t),
      name: optionalText(120, t("transparency-lead.name")),
      company: optionalText(160),
      projectType: z.enum(SERVICE_IDS, { error: t("transparency-lead.projectType") }),
      complexity: z.enum(COMPLEXITY_IDS, { error: t("transparency-lead.complexity") }),
      timeline: z.enum(TIMELINE_IDS, { error: t("transparency-lead.timeline") }),
      brandIdentity: z.enum(BRAND_IDENTITY_IDS).optional(),
      contentReadiness: z.enum(CONTENT_READINESS_IDS).optional(),
      scopeNotes: z
        .array(z.enum(SCOPE_NOTE_IDS), { error: t("transparency-lead.scopeNotes") })
        .max(SCOPE_NOTE_IDS.length * 2, t("transparency-lead.scopeNotes"))
        .default([])
        .transform((ids) => SCOPE_NOTE_IDS.filter((id) => ids.includes(id))),
      note: optionalText(1000, t("transparency-lead.note")),
      priceMin: z.number().int().min(0).optional(),
      priceMax: z.number().int().min(0).optional(),
      weeksMin: z.number().int().min(0).optional(),
      weeksMax: z.number().int().min(0).optional(),
    })
    .superRefine(requireOneContact(t));
