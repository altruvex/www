import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitHeadline(value: string): {
  first: string;
  second: string;
} {
  if (!value.trim()) return { first: "", second: "" };
  const sentenceMatch = value.match(/^(.+[.!?،])\s+(.+)$/);
  if (sentenceMatch)
    return { first: sentenceMatch[1], second: sentenceMatch[2] };
  const words = value.trim().split(/\s+/);
  if (words.length < 2) return { first: value, second: "" };
  const splitAt = Math.ceil(words.length / 2);
  return {
    first: words.slice(0, splitAt).join(" "),
    second: words.slice(splitAt).join(" "),
  };
}
