// The one cn (and its tailwind-merge registry) lives in @repo/ui; www reads it from there.
export { cn } from "@repo/ui/lib/utils";

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

export function getDomainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
