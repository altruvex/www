import { z } from "zod";
import { normalizeNumeralsToEnglish } from "../number";

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

export const createContactFormSchema = (t: ValidationTranslator) =>
  z
    .object({
      name: nameField(t),

      phone: contactPhoneField(t),

      message: z
        .string()
        .min(10, t("contact.message-min"))
        .max(1000, t("contact.message-max"))
        .trim(),

      serviceInterest: z
        .enum(
          ["web-development", "ecommerce", "multilingual", "ui-ux", "other"],
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
