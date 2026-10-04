import type { Amount, Currency, Locale, PriceRange } from "./types";

const NUMBER_LOCALE: Readonly<Record<Locale, string>> = {
  en: "en-US",
  ar: "ar-EG-u-nu-latn",
};

const CURRENCY_SUFFIX: Readonly<Record<Locale, Record<Currency, string>>> = {
  en: { EGP: "EGP", USD: "USD" },
  ar: { EGP: "جنيه", USD: "دولار" },
};

const FROM_PREFIX: Readonly<Record<Locale, string>> = {
  en: "From",
  ar: "تبدأ من",
};

const RANGE_SEPARATOR = "–";

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMoney(
  amount: Amount,
  locale: Locale,
  currency: Currency = "EGP",
): string {
  return `${formatNumber(amount, locale)} ${CURRENCY_SUFFIX[locale][currency]}`;
}

export function formatRange(
  range: PriceRange,
  locale: Locale,
  currency: Currency = "EGP",
): string {
  const min = formatNumber(range.min, locale);
  const max = formatNumber(range.max, locale);
  return `${min} ${RANGE_SEPARATOR} ${max} ${CURRENCY_SUFFIX[locale][currency]}`;
}

export function formatFrom(
  amount: Amount,
  locale: Locale,
  currency: Currency = "EGP",
): string {
  return `${FROM_PREFIX[locale]} ${formatMoney(amount, locale, currency)}`;
}

export function formatWeeks(min: number, max: number, locale: Locale): string {
  return `${formatNumber(min, locale)}${RANGE_SEPARATOR}${formatNumber(max, locale)}`;
}

export function formatPercent(rate: number, locale: Locale): string {
  return formatNumber(Math.round(rate * 100), locale);
}

export function formatPercentLabel(rate: number, locale: Locale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(rate);
}

export function formatSignedPercent(rate: number, locale: Locale): string {
  const text = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(rate);
  return locale === "en" ? text.replace("-", "−") : text;
}

export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
