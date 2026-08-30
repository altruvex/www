"use client";

import { localizeNumbers } from "@/lib/utils/number";
import { useLocale } from "next-intl";

interface NumProps {
  value: string | number;
  /** Zero-pad to this width BEFORE localizing, so the pad character is localized too. */
  pad?: number;
}

/**
 * Renders a number in the reading locale's numeral system — Arabic-Indic under
 * `ar`, Latin otherwise.
 *
 * This is a component rather than a hook so that a call site buried in a nested
 * render tree can localize without every one of those components having to take
 * a `useLocale()` dependency of its own.
 *
 * Pad through the `pad` prop rather than passing an already-padded string:
 * padding after localizing produces a Latin "0" glued to Arabic-Indic digits
 * (`0١` instead of `٠١`).
 */
export function Num({ value, pad }: NumProps) {
  const locale = useLocale();
  const text = pad ? String(value).padStart(pad, "0") : String(value);

  return <>{localizeNumbers(text, locale)}</>;
}
