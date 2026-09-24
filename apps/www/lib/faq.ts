import type { FaqListItem } from "@/components/shared/faq-list";

type PlainFaq = { q: string; a: string };

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The SEO copy blocks (`*.seo.faq.items`) are plain `{ q, a }` text, while the
 * shared FAQ list renders answer HTML. Escaping here, in one place, keeps a
 * stray "<" in a message from ever being read as markup. Server-safe: no
 * "use client", so server pages can build their items before handing them on.
 */
export function plainFaqItems(items: PlainFaq[]): FaqListItem[] {
  return items.map((item, index) => ({
    id: String(index + 1),
    question: item.q,
    answer: `<p>${escapeHtml(item.a)}</p>`,
  }));
}
