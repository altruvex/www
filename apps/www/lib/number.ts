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
  } else {
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicDigits[i], "g"), latinDigits[i]);
    }
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

  return result;
}
