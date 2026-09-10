"use client";

import { localizeNumbers } from "@/lib/utils/number";
import { useLocale } from "next-intl";

interface NumProps {
  value: string | number;
  pad?: number;
}

export function Num({ value, pad }: NumProps) {
  const locale = useLocale();
  const text = pad ? String(value).padStart(pad, "0") : String(value);

  return <>{localizeNumbers(text, locale)}</>;
}
