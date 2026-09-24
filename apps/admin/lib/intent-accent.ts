import type { ColorWorld } from "@repo/database";
import { GRADIENT_VIA_HSL, hslToHex, PALETTE } from "@repo/ui/palette";

export interface IntentAccent {
  world: ColorWorld;
  accentName: string;
  label: string;
  light: string;
  dark: string;
}

// The INTENT SELECTION GUIDE — direct port of
// ~/.claude/skills/altruvex-design-intelligence/references/00-altruvex-taste.md.
// Each accent is the middle stop of the site's gradient of the same name,
// resolved from @repo/ui/palette — so it cannot drift from globals.css.
const via = (name: keyof typeof GRADIENT_VIA_HSL, mode: "light" | "dark") =>
  hslToHex(GRADIENT_VIA_HSL[name][mode]);

export const INTENT_ACCENTS: Record<string, IntentAccent> = {
  iris: { world: "BLUE", accentName: "iris", label: "Iris (Tech / SaaS / AI / startups)", light: via("iris", "light"), dark: via("iris", "dark") },
  ocean: { world: "BLUE", accentName: "ocean", label: "Ocean (Data / Analytics / Infrastructure)", light: via("ocean", "light"), dark: via("ocean", "dark") },
  brand: { world: "BLUE", accentName: "brand", label: "Brand (Legal / Finance / Audit / Corporate)", light: via("brand", "light"), dark: via("brand", "dark") },
  sunset: { world: "ORANGE", accentName: "sunset", label: "Sunset (Architecture / Real estate)", light: via("sunset", "light"), dark: via("sunset", "dark") },
  ember: { world: "ORANGE", accentName: "ember", label: "Ember (Hospitality / Food / Retail)", light: via("ember", "light"), dark: via("ember", "dark") },
  mint: { world: "GREEN", accentName: "mint", label: "Mint (Healthcare / Wellness / Education)", light: via("mint", "light"), dark: via("mint", "dark") },
  forest: { world: "GREEN", accentName: "forest", label: "Forest (E-commerce / Manufacturing / Logistics)", light: via("forest", "light"), dark: via("forest", "dark") },
  none: { world: "NONE", accentName: "none", label: "None (Premium / Luxury / Personal brand — pure restraint)", light: PALETTE.light["n-8"], dark: PALETTE.dark.foreground },
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
