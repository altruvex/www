import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo";

export interface HeroCopy {
  badge: string;
  title_line1: string;
  title_line2: string;
  sub: string;
}

/** The live hero copy, so specimens show what the site says — never sample text. */
export function heroCopy(locale: "en" | "ar"): HeroCopy {
  const file = join(repoRoot(), "apps/www/messages", locale, "hero.json");
  return JSON.parse(readFileSync(file, "utf8")) as HeroCopy;
}

/** Live nav labels — the site's own call-to-action wording. */
export function navCopy(locale: "en" | "ar"): Record<string, string> {
  const file = join(repoRoot(), "apps/www/messages", locale, "nav.json");
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
}
