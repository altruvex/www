export const PALETTE_HSL = {
  light: {
    "n-0": "0 0% 98%",
    "n-1": "0 0% 96%",
    "n-2": "0 0% 91%",
    "n-3": "0 0% 84%",
    "n-4": "0 0% 65%",
    "n-5": "0 0% 45%",
    "n-6": "0 0% 32%",
    "n-7": "0 0% 18%",
    "n-8": "0 0% 6%",
    brand: "214 89% 48%",
    "brand-hover": "214 89% 41%",
    "brand-text": "214 90% 43%",
    background: "0 0% 98%",
    foreground: "0 0% 6%",
    card: "0 0% 100%",
    surface: "0 0% 94%",
    "muted-foreground": "0 0% 40%",
    success: "162 95% 31%",
    warning: "38 96% 40%",
    danger: "0 65% 51%",
  },
  dark: {
    "brand-text": "214 95% 64%",
    background: "0 0% 7%",
    foreground: "0 0% 94%",
    card: "0 0% 9%",
    surface: "0 0% 11%",
    "surface-2": "0 0% 14%",
    "muted-foreground": "0 0% 58%",
    success: "162 60% 50%",
    warning: "36 84% 60%",
    danger: "0 74% 68%",
  },
} as const;

export const GRADIENT_VIA_HSL = {
  iris: { light: "250 76% 58%", dark: "250 92% 70%" },
  ocean: { light: "206 86% 46%", dark: "204 92% 62%" },
  brand: { light: "224 84% 50%", dark: "222 92% 66%" },
  sunset: { light: "10 86% 54%", dark: "12 92% 64%" },
  ember: { light: "24 92% 48%", dark: "26 96% 60%" },
  mint: { light: "168 70% 36%", dark: "170 50% 52%" },
  forest: { light: "152 62% 38%", dark: "148 46% 54%" },
} as const;

export function hslToHex(channels: string): string {
  const [h, s, l] = channels.split(/\s+/).map((part) => Number.parseFloat(part)) as [number, number, number];
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)]
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

type Hexed<T> = { readonly [K in keyof T]: string };
const hexAll = <T extends Record<string, string>>(set: T): Hexed<T> =>
  Object.fromEntries(Object.entries(set).map(([k, v]) => [k, hslToHex(v)])) as Hexed<T>;

export const PALETTE = {
  light: hexAll(PALETTE_HSL.light),
  dark: hexAll(PALETTE_HSL.dark),
} as const;

export const css = (hex: string) => `#${hex}`;
