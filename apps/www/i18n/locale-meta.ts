import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Per-locale facts, in one place. English and Arabic are the locales that ship
 * today, not the boundary of the system (docs/multilingual-system.md): adding a
 * locale means adding it to `routing.locales`, adding its messages, and filling
 * in its row here — TypeScript refuses the build until the row exists.
 *
 * Code never asks "is this Arabic?". It asks the row: which direction, which
 * script, which Intl tag. Direction-driven styling stays in CSS (`dir`,
 * `:lang()`, logical properties); this table is for what JS has to decide.
 */

export type Locale = (typeof routing.locales)[number];

/** Script family. Keys the brand face and script-genuine type rules (case, tracking). */
type Script = "latin" | "arabic";

type LocaleMeta = {
  /** Writing direction, rendered as `<html dir>`. */
  dir: "ltr" | "rtl";
  /**
   * BCP 47 tag every Intl formatter (dates, times, numbers) uses. Figures are
   * Latin digits in every locale (Ali, 2026-10-04), so non-Latin-digit
   * locales carry `-u-nu-latn`.
   */
  intl: string;
  /** Open Graph `og:locale` (language_TERRITORY). */
  og: string;
  /** Script family; picks the brand face and whether case/tracking apply. */
  script: Script;
  /** The locale's own name for itself, for the language switcher. */
  nativeName: string;
  /** Separator between items in an inline run-on list. */
  listSeparator: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: {
    dir: "ltr",
    intl: "en-US",
    og: "en_US",
    script: "latin",
    nativeName: "English",
    listSeparator: " · ",
  },
  ar: {
    dir: "rtl",
    intl: "ar-EG-u-nu-latn",
    og: "ar_EG",
    script: "arabic",
    nativeName: "العربية",
    listSeparator: "، ",
  },
};

/** A supported locale, or the default for anything else (bad input, `undefined`). */
export function toLocale(locale: unknown): Locale {
  return typeof locale === "string" && hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
}

export function localeMeta(locale: string): LocaleMeta {
  return LOCALE_META[toLocale(locale)];
}

/**
 * Scripts that have letter case and take positive display tracking. Arabic is
 * cursive: tracking breaks the joins and there is no uppercase.
 */
export function scriptHasCase(script: Script): boolean {
  return script === "latin";
}

/**
 * The locale a one-tap language toggle offers: the next one in routing order,
 * wrapping. With two locales this is "the other one"; with more it cycles.
 */
export function nextLocale(locale: string): Locale {
  const locales = routing.locales;
  const index = locales.indexOf(toLocale(locale));
  return locales[(index + 1) % locales.length];
}
