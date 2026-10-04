// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so call sites keep their shape
export function localizeNumbers(input: string, _locale: string): string {
  if (!input) return "";

  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const latinDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicDigits[i], "g"), latinDigits[i]);
  }
  result = result.replace(/([0-9])٫(?=[0-9])/g, "$1.");
  result = result.replace(/([0-9])٬(?=[0-9])/g, "$1,");
  result = result.replace(/([0-9])(\s*)٪/g, "$1$2%");

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

  result = result
    .replace(/٫/g, ".")
    .replace(/٬/g, ",")
    .replace(/٪/g, "%");

  return result;
}

export function formatIndex(
  value: string | number,
  pad: number,
  locale: string,
): string {
  return localizeNumbers(String(value).padStart(pad, "0"), locale);
}
