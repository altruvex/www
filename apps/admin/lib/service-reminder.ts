import { serviceRenewalDraft, type EmailDraft } from "@/lib/email-templates";
import { money } from "@/lib/format";
import { formatDocDate } from "@/lib/proposal-schema";
import { KIND_LABEL, perTermLabel } from "@/lib/service-lifecycle";
import type { ClientServiceKind } from "@repo/database";

export function reminderDraftFor(service: {
  kind: ClientServiceKind;
  name: string;
  price: number | null;
  currency: string;
  termMonths: number | null;
  expiresAt: Date | string;
  clientName: string | null;
}): EmailDraft {
  return serviceRenewalDraft({
    clientName: service.clientName,
    serviceName: service.name,
    kindLabel: KIND_LABEL[service.kind],
    expires: formatDocDate(new Date(service.expiresAt)) ?? String(service.expiresAt),
    price:
      service.price == null
        ? "the current rate"
        : `${money(service.price, service.currency)} ${perTermLabel(service.termMonths)}`,
  });
}

export function whatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
