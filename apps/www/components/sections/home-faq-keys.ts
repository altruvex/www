/**
 * The `faq.questions` entries the homepage FAQ shows, in order. A plain module
 * (not the client section) so the home page's FAQPage JSON-LD reads the same
 * list the section renders and the two can never drift.
 */
export const HOME_FAQ_QUESTION_KEYS = ["03", "04", "11", "09", "07"] as const;
