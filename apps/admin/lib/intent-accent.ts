import type { ColorWorld } from "@repo/database";
import { GRADIENT_VIA_HSL, hslToHex, PALETTE } from "@repo/ui/palette";

export interface IntentAccent {
  world: ColorWorld;
  accentName: string;
  label: string;
  light: string;
  dark: string;
}

const via = (name: keyof typeof GRADIENT_VIA_HSL, mode: "light" | "dark") =>
  hslToHex(GRADIENT_VIA_HSL[name][mode]);

export const INTENT_ACCENTS: Record<string, IntentAccent> = {
  iris: { world: "BLUE", accentName: "iris", label: "Iris (Tech / SaaS / AI / startups)", light: via("iris", "light"), dark: via("iris", "dark") },
  ocean: { world: "BLUE", accentName: "ocean", label: "Ocean (Data / Analytics / Infrastructure)", light: via("ocean", "light"), dark: via("ocean", "dark") },
  brand: { world: "BLUE", accentName: "brand", label: "Brand (Legal / Finance / Audit / Corporate)", light: via("brand", "light"), dark: via("brand", "dark") },
  sunset: { world: "ORANGE", accentName: "sunset", label: "Sunset (Architecture / Real estate)", light: via("sunset", "light"), dark: via("sunset", "dark") },
  ember: { world: "ORANGE", accentName: "ember", label: "Ember (Hospitality / Food / Retail)", light: via("ember", "light"), dark: via("ember", "dark") },
  mint: { world: "GREEN", accentName: "mint", label: "Mint (Healthcare / Wellness / Education)", light: via("mint", "light"), dark: via("mint", "dark") },
  forest: { world: "GREEN", accentName: "forest", label: "Forest (E-commerce / Manufacturing / Logistics / Electric / Energy)", light: via("forest", "light"), dark: via("forest", "dark") },
  none: { world: "NONE", accentName: "none", label: "None (Premium / Luxury / Personal brand — pure restraint)", light: PALETTE.light["n-8"], dark: PALETTE.dark.foreground },
};

const INDUSTRY_KEYWORDS: { pattern: RegExp; accent: string }[] = [
  // before the tech rule: "biotech", "fintech", "healthtech", "edtech" all contain "tech"
  { pattern: /biotech|pharma|life science|health ?tech|med ?tech|ed ?tech/i, accent: "mint" },
  { pattern: /fin ?tech|insur ?tech|reg ?tech|legal ?tech/i, accent: "brand" },
  { pattern: /cyber|security|aerospace|aviation/i, accent: "ocean" },
  { pattern: /tech|saas|ai\b|startup|software|gaming|game|hardware|electronics/i, accent: "iris" },
  { pattern: /data|analytic|infrastructure|cloud|telecom|network/i, accent: "ocean" },
  { pattern: /legal|law|finance|financial|audit|corporate|bank|insurance|government|public sector|consulting/i, accent: "brand" },
  { pattern: /architect|real estate|property|construction|media|publishing|marketing|advertising/i, accent: "sunset" },
  { pattern: /hospitality|hotel|food|restaurant|retail|automotive|car\b|travel|tourism|sport|fitness|fashion|apparel/i, accent: "ember" },
  { pattern: /health|medical|clinic|wellness|education|school|university|non-?profit|charity/i, accent: "mint" },
  { pattern: /e-?commerce|manufactur|logistics|supply chain|electric|energy|power|solar|utilit|agricultur|farm|mining|oil|gas\b/i, accent: "forest" },
  { pattern: /luxury|premium|personal brand/i, accent: "none" },
];

export function matchIntentAccent(industry: string | null | undefined): string | null {
  if (!industry) return null;
  return INDUSTRY_KEYWORDS.find(({ pattern }) => pattern.test(industry))?.accent ?? null;
}

export function suggestIntentAccent(industry: string | null | undefined): string {
  return matchIntentAccent(industry) ?? "ocean";
}

export function getIntentAccent(accentName: string): IntentAccent {
  return INTENT_ACCENTS[accentName] ?? INTENT_ACCENTS.ocean;
}
