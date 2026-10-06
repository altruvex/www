import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* The custom type steps (tokens.css + www globals.css) registered as font sizes. Unregistered,
   twMerge reads text-meta or text-body as a colour and drops the real text colour beside it.
   The edge-system radii are registered for the same reason: unregistered, rounded-ctl-xl on
   Textarea does not replace the control surface's rounded-full, and the textarea renders a pill. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "meta", "md", "body"],
      radius: ["ctl-xs", "ctl-sm", "ctl", "ctl-lg", "ctl-xl", "panel-sm", "panel-md", "panel-lg", "panel-inset", "overlay", "menu"],
    },
  },
});

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
