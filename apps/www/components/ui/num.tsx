"use client";

import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import { useLocale } from "next-intl";

interface NumProps {
  value: string | number;
  pad?: number;
}

export function Num({ value, pad }: NumProps) {
  const locale = useLocale();
  // Padding follows formatIndex: Arabic index labels carry no leading zero.
  return (
    <>
      {pad
        ? formatIndex(value, pad, locale)
        : localizeNumbers(String(value), locale)}
    </>
  );
}
