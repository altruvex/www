"use client";

import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import { useLocale } from "next-intl";

interface NumProps {
  value: string | number;
  pad?: number;
}

export function Num({ value, pad }: NumProps) {
  const locale = useLocale();
  return (
    <>
      {pad
        ? formatIndex(value, pad, locale)
        : localizeNumbers(String(value), locale)}
    </>
  );
}
