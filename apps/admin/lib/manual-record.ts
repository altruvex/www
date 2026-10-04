import { z } from "zod";

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

export const manualRecordFields = {
  channel: z.enum(MANUAL_CHANNELS).optional(),
  occurredAt: z.coerce
    .date()
    .optional()
    .refine((value) => !value || value.getTime() <= Date.now() + 60_000, {
      message: "The date cannot be in the future.",
    }),
  note: z.string().trim().max(500).optional(),
};

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
