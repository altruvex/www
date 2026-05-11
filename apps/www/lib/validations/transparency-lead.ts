import { z } from "zod";
import { normalizeNumeralsToEnglish } from "../number";

type ValidationTranslator = (key: string) => string;

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
    name: z.string().max(120, t("transparency-lead.name")).optional(),
    projectType: z.string().min(1, t("transparency-lead.projectType")),
    complexity: z.string().min(1, t("transparency-lead.complexity")),
    timeline: z.string().min(1, t("transparency-lead.timeline")),
    priceMin: z.number().int().min(0),
    priceMax: z.number().int().min(0),
    weeksMin: z.number().int().min(0),
    weeksMax: z.number().int().min(0),
  });
