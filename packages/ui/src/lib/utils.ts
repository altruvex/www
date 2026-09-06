import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEasternArabicNumerals(value: string) {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  if (!value) return value;

  return value
    .replace(/[٠-٩]/g, (char) => arabicNumbers.indexOf(char).toString())
    .replace(/[۰-۹]/g, (char) => persianNumbers.indexOf(char).toString());
}
