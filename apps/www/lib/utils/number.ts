export function localizeNumbers(input: string, locale: string): string {
  if (!input) return "";

  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const latinDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  const lang = locale.split("-")[0];

  let result = input;

  if (lang === "ar") {
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(latinDigits[i], "g"), arabicDigits[i]);
    }
    // Separators are converted only in numeric context. This function also
    // receives whole translated sentences, so a bare `.` must stay a full
    // stop and a bare `,` must stay a comma — only a separator sitting
    // BETWEEN two digits is a numeric separator, and only a `%` attached to
    // a digit is a percent sign.
    // Lookahead, not a capture, so runs of separators ("1,234,567", "1.2.3")
    // all match instead of the regex eating the digit the next match needs.
    result = result.replace(/([٠-٩])\.(?=[٠-٩])/g, "$1٫");
    result = result.replace(/([٠-٩]),(?=[٠-٩])/g, "$1٬");
    result = result.replace(/([٠-٩])(\s*)%/g, "$1$2٪");
  } else {
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicDigits[i], "g"), latinDigits[i]);
    }
    result = result.replace(/([0-9])٫(?=[0-9])/g, "$1.");
    result = result.replace(/([0-9])٬(?=[0-9])/g, "$1,");
    result = result.replace(/([0-9])(\s*)٪/g, "$1$2%");
  }

  return result;
}

export function normalizeNumeralsToEnglish(input: string): string {
  if (!input) return "";

  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const latinDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicDigits[i], "g"), latinDigits[i]);
  }
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], "g"), latinDigits[i]);
  }

  // Arabic decimal/thousands/percent marks have no meaning to `Number()` or to
  // the validation schemas that call this, so they are always folded back to
  // their ASCII forms — unlike localizeNumbers, this direction is unambiguous.
  result = result
    .replace(/٫/g, ".")
    .replace(/٬/g, ",")
    .replace(/٪/g, "%");

  return result;
}
