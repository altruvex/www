import { serviceRenewalDraft, type EmailDraft } from "@/lib/email-templates";
import { money } from "@/lib/format";
import { formatDocDate } from "@/lib/proposal-schema";
import { KIND_LABEL, perTermLabel } from "@/lib/service-lifecycle";
import type { ClientServiceKind } from "@repo/database";

/**
 * The default renewal reminder for one service, built the same way on the
 * screen that pre-fills it and on the route that falls back to it — one source,
 * so the draft an operator saw is the draft that is sent when they edit nothing.
 */
export function reminderDraftFor(service: {
  kind: ClientServiceKind;
  name: string;
  price: number;
  currency: string;
  termMonths: number;
  expiresAt: Date | string;
  clientName: string | null;
}): EmailDraft {
  return serviceRenewalDraft({
    clientName: service.clientName,
    serviceName: service.name,
    kindLabel: KIND_LABEL[service.kind],
    expires: formatDocDate(new Date(service.expiresAt)) ?? String(service.expiresAt),
    price: `${money(service.price, service.currency)} ${perTermLabel(service.termMonths)}`,
  });
}

/**
 * A wa.me link that opens the operator's own WhatsApp with the text filled in.
 *
 * Not a send. The Business API only lets a business open a conversation with
 * an approved template, and there is no renewal template — so this hands the
 * message to a person, who sends it from their phone and then records that
 * they did. Nothing is claimed as delivered.
 */
export function whatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
