import { SITE_CONFIG } from "@/lib/metadata";

export function getWhatsAppUrl(phone: string = SITE_CONFIG.phone): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
