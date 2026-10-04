"use client";

import { ComboboxSelect } from "@/components/os/combobox-select";

const INDUSTRIES = [
  "Technology / SaaS",
  "Data / Analytics",
  "Cloud / Infrastructure",
  "Legal",
  "Finance / Banking",
  "Audit / Corporate",
  "Architecture",
  "Real estate",
  "Construction",
  "Hospitality / Hotels",
  "Food / Restaurants",
  "Retail",
  "Healthcare / Medical",
  "Wellness",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Logistics / Supply chain",
  "Luxury / Premium",
];

export function IndustrySelect({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <ComboboxSelect
      name={name}
      options={INDUSTRIES}
      defaultValue={defaultValue}
      searchPlaceholder="Search or type your own"
      emptyLabel="Type to use your own."
      allowCustom
    />
  );
}
