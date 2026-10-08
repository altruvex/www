import { z } from "zod";
import { isBudgetAnswerId } from "@repo/pricing-schema";
import { normalizeNumeralsToEnglish } from "../utils/number";

type ValidationTranslator = (key: string) => string;

const nameField = (t: ValidationTranslator) =>
  z
    .string()
    .min(2, t("contact.name-min"))
    .max(100, t("contact.name-max"))
    .trim();

const contactPhoneField = (t: ValidationTranslator) =>
  z.preprocess(
    (val) => (typeof val === "string" ? normalizeNumeralsToEnglish(val) : val),
    z
      .string()
      .min(10, t("contact.phone-min"))
      .max(20, t("contact.phone-max"))
      .regex(/^[\d\s\-\+\(\)]+$/, t("contact.phone-regex"))
      .trim(),
  );

const preferredDateCore = (t: ValidationTranslator) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t("contact.preferred-date-format"))
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      { message: t("contact.preferred-date-future") },
    )
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        return selectedDate <= maxDate;
      },
      { message: t("contact.preferred-date-within-three-months") },
    );

// Required: a reply channel that survives a wrong digit in the phone number.
const contactEmailField = (t: ValidationTranslator) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .string({ error: t("contact.email-required") })
      .min(1, t("contact.email-required"))
      .max(160, t("contact.email-max"))
      .pipe(z.email(t("contact.email-invalid"))),
  );

export const createContactFormSchema = (t: ValidationTranslator) =>
  z
    .object({
      name: nameField(t),

      phone: contactPhoneField(t),

      email: contactEmailField(t),

      message: z
        .string()
        .min(10, t("contact.message-min"))
        .max(1000, t("contact.message-max"))
        .trim(),

      serviceInterest: z
        .enum(
          [
            "web-development",
            "ecommerce",
            "multilingual",
            "ui-ux",
            "technical-audit",
            "maintenance",
            "other",
          ],
          { error: t("contact.service-interest-invalid") },
        )
        .optional(),

      budget: z
        .enum(["under_10k", "b_10k_25k", "b_25k_50k", "over_50k"], {
          error: t("contact.budget-invalid"),
        })
        .optional(),

      projectTimeline: z
        .enum(["immediate", "soon", "planning", "exploring"], {
          error: t("contact.project-timeline-invalid"),
        })
        .optional(),

      website: z.string().max(0, t("contact.honeypot-invalid")).optional(),

      requestMeeting: z.boolean().optional(),
      preferredDate: preferredDateCore(t).optional(),
      preferredTime: z
        .enum(["morning", "afternoon", "evening"], {
          error: t("contact.preferred-time-invalid"),
        })
        .optional(),
    })
    .refine(
      (data) => {
        if (data.requestMeeting) {
          return !!data.preferredDate && !!data.preferredTime;
        }
        return true;
      },
      {
        message: t("contact.request-meeting-required"),
        path: ["preferredDate"],
      },
    );

export const createMeetingRequestSchema = (t: ValidationTranslator) =>
  z.object({
    contactSubmissionId: z.string().uuid({
      message: t("contact.submission-id-invalid"),
    }),
    preferredDate: preferredDateCore(t),
    preferredTime: z.enum(["morning", "afternoon", "evening"], {
      error: t("contact.preferred-time-invalid"),
    }),
    notes: z.string().max(500, t("contact.notes-max")).optional(),
  });

export const createStandaloneMeetingSchema = (t: ValidationTranslator) =>
  z.object({
    name: nameField(t),
    phone: contactPhoneField(t),
    message: z.string().max(1000, t("contact.message-max")).trim().optional(),
    scheduledDate: z.string().datetime({
      message: t("contact.scheduled-datetime-invalid"),
    }),
    scheduledTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, t("contact.scheduled-time-format")),
  });

// The optional follow-up steps after a successful submit. Each carries the
// step token from the first response; answers are ids only, never free text
// except the pre-call brief.
const stepTokenField = z.string().min(20).max(100);

export const QUALIFY_SITUATIONS = [
  "new-build",
  "replace-existing",
  "improve-existing",
] as const;
export const QUALIFY_TIMELINES = [
  "immediate",
  "soon",
  "planning",
  "exploring",
] as const;
export const QUALIFY_DECISION_ROLES = ["decides", "shared", "advises"] as const;

export const qualifySchema = z
  .object({
    token: stepTokenField,
    situation: z.enum(QUALIFY_SITUATIONS).optional(),
    budget: z.string().refine(isBudgetAnswerId).optional(),
    projectTimeline: z.enum(QUALIFY_TIMELINES).optional(),
    decisionRole: z.enum(QUALIFY_DECISION_ROLES).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.situation ||
          data.budget ||
          data.projectTimeline ||
          data.decisionRole,
      ),
    { path: ["form"], message: "contact.step-empty" },
  );

export const PRECALL_BRIEF_MAX = 600;

const briefText = z
  .string()
  .trim()
  .max(PRECALL_BRIEF_MAX, "contact.brief-max")
  .default("");

export const preCallBriefSchema = z
  .object({
    token: stepTokenField,
    current: briefText,
    change: briefText,
    stakes: briefText,
  })
  .refine((data) => Boolean(data.current || data.change || data.stakes), {
    path: ["form"],
    message: "contact.step-empty",
  });
