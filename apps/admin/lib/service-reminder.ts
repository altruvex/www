import { DEFAULT_DIAL_ISO, parsePhone } from "@/lib/dial-codes";
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

/**
 * The number wa.me needs (country code + national digits), read only from what
 * the stored phone itself says — never a guessed country.
 * - `+` / `00`: an international number keeps its own country code.
 * - digits with no prefix and no leading 0: an E.164 number stored by
 *   normalizePhone from the admin phone input (as splitStoredPhone reads it).
 * - `01[0125]` + 8 digits: the Egyptian mobile shape, the one local form that
 *   names its country.
 * Any other local number (a leading trunk 0, or digits that do not read back
 * as a whole E.164 number) gives null, and the sheets offer no link.
 */
export function whatsappNumber(phone: string): string | null {
  const text = phone.trim();
  const compact = text.replace(/[\s().-]/g, "");
  if (/^01[0125]\d{8}$/.test(compact)) return `20${compact.slice(1)}`;
  const international = /^(\+|00)/.test(compact);
  if (!international && compact.startsWith("0")) return null;
  const parsed = parsePhone(international ? text : `+${text}`, DEFAULT_DIAL_ISO);
  if (parsed.error || !parsed.e164) return null;
  const digits = parsed.e164.slice(1);
  if (!international && digits !== compact) return null;
  return digits;
}

export function whatsappLink(phone: string, text: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
