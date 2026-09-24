import { z } from "zod";

/**
 * Recording by hand what happened outside the system.
 *
 * The automated paths (email, WhatsApp template, click-to-sign) are the
 * default, but a deal cannot be held hostage by an unconfigured transport: a
 * proposal handed over in a meeting, or a contract sent from a personal inbox,
 * still has to move the record forward.
 *
 * The honesty rule still holds. A manual record never creates an
 * `EmailMessage` or `WhatsAppMessage` row and never claims the system sent
 * anything — it writes the new status and an audit event marked `manual: true`
 * with the channel the operator named, so `/audit` reads "recorded by hand as
 * sent in person", not "sent".
 */

export const MANUAL_CHANNELS = [
  "IN_PERSON",
  "PERSONAL_WHATSAPP",
  "PERSONAL_EMAIL",
  "PHONE",
  "OTHER",
] as const;

export type ManualChannel = (typeof MANUAL_CHANNELS)[number];

export const MANUAL_CHANNEL_LABELS: Record<ManualChannel, string> = {
  IN_PERSON: "In person",
  PERSONAL_WHATSAPP: "Personal WhatsApp",
  PERSONAL_EMAIL: "Personal email",
  PHONE: "Phone call",
  OTHER: "Other",
};

/** Fields every manual record carries, whatever the entity. */
export const manualRecordFields = {
  channel: z.enum(MANUAL_CHANNELS).optional(),
  /** When it actually happened. Defaults to now; never in the future. */
  occurredAt: z.coerce
    .date()
    .optional()
    .refine((value) => !value || value.getTime() <= Date.now() + 60_000, {
      message: "The date cannot be in the future.",
    }),
  note: z.string().trim().max(500).optional(),
};

/** The metadata block written into the audit event for a manual record. */
export function manualMetadata(input: {
  channel?: ManualChannel;
  occurredAt?: Date;
  note?: string;
}) {
  return {
    manual: true,
    ...(input.channel ? { channel: input.channel } : {}),
    ...(input.occurredAt ? { occurredAt: input.occurredAt.toISOString() } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
}

export function channelPhrase(channel?: ManualChannel) {
  return channel ? ` (${MANUAL_CHANNEL_LABELS[channel].toLowerCase()})` : "";
}
