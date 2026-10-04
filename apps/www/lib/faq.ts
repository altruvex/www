import type { FaqListItem } from "@/components/shared/faq-list";

type PlainFaq = { q: string; a: string };

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function plainFaqItems(items: PlainFaq[]): FaqListItem[] {
  return items.map((item, index) => ({
    id: String(index + 1),
    question: item.q,
    answer: `<p>${escapeHtml(item.a)}</p>`,
  }));
}
