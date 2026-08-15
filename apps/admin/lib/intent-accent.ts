import type { ColorWorld } from "@repo/database";

export interface IntentAccent {
  world: ColorWorld;
  accentName: string;
  label: string;
  light: string;
  dark: string;
}

// The INTENT SELECTION GUIDE — direct port of
// ~/.claude/skills/altruvex-design-intelligence/references/00-altruvex-taste.md.
// Every hex here is a conversion of the live site's own globals.css tokens —
// never invent a value here without updating that file too.
export const INTENT_ACCENTS: Record<string, IntentAccent> = {
  iris: { world: "BLUE", accentName: "iris", label: "Iris (Tech / SaaS / AI / startups)", light: "5E43E5", dark: "846CF9" },
  ocean: { world: "BLUE", accentName: "ocean", label: "Ocean (Data / Analytics / Infrastructure)", light: "1083DA", dark: "45B0F7" },
  brand: { world: "BLUE", accentName: "brand", label: "Brand (Legal / Finance / Audit / Corporate)", light: "144EEB", dark: "5988F8" },
  sunset: { world: "ORANGE", accentName: "sunset", label: "Sunset (Architecture / Real estate)", light: "F2542C", dark: "F9754D" },
  ember: { world: "ORANGE", accentName: "ember", label: "Ember (Hospitality / Food / Retail)", light: "EB640A", dark: "FB8C37" },
  mint: { world: "GREEN", accentName: "mint", label: "Mint (Healthcare / Wellness / Education)", light: "1DA58A", dark: "47C2AD" },
  forest: { world: "GREEN", accentName: "forest", label: "Forest (E-commerce / Manufacturing / Logistics)", light: "259D65", dark: "54C086" },
  none: { world: "NONE", accentName: "none", label: "None (Premium / Luxury / Personal brand — pure restraint)", light: "0F0F0F", dark: "F0F0F0" },
};

const INDUSTRY_KEYWORDS: { pattern: RegExp; accent: string }[] = [
  { pattern: /tech|saas|ai\b|startup|software/i, accent: "iris" },
  { pattern: /data|analytic|infrastructure|cloud/i, accent: "ocean" },
  { pattern: /legal|law|finance|financial|audit|corporate|bank/i, accent: "brand" },
  { pattern: /architect|real estate|property|construction/i, accent: "sunset" },
  { pattern: /hospitality|hotel|food|restaurant|retail/i, accent: "ember" },
  { pattern: /health|medical|clinic|wellness|education|school|university/i, accent: "mint" },
  { pattern: /e-?commerce|manufactur|logistics|supply chain/i, accent: "forest" },
  { pattern: /luxury|premium|personal brand/i, accent: "none" },
];

/** Suggests an intent accent from a client's free-text industry. Falls back
 * to "ocean" (the estimator's own documented default) when nothing matches —
 * Ali always sees this as an editable suggestion, never a silent choice. */
export function suggestIntentAccent(industry: string | null | undefined): string {
  if (!industry) return "ocean";
  const match = INDUSTRY_KEYWORDS.find(({ pattern }) => pattern.test(industry));
  return match?.accent ?? "ocean";
}

export function getIntentAccent(accentName: string): IntentAccent {
  return INTENT_ACCENTS[accentName] ?? INTENT_ACCENTS.ocean;
}
