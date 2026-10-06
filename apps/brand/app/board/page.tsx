import { readdirSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Board } from "@/components/board/board";
import type { InventoryGroup, InventoryItem } from "@/components/board/inventory";
import { BOARD_SOURCES, type SourceKey } from "@/lib/board-sources";
import { editorHref, repoRoot } from "@/lib/repo";

export const metadata: Metadata = { title: "Component board" };

/** The .tsx files under `dir` (repo-relative), sorted; `deep` walks subfolders too. */
function components(dir: string, deep = true): InventoryItem[] {
  const entries = readdirSync(path.join(repoRoot(), dir), { recursive: deep, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => path.relative(repoRoot(), path.join(e.parentPath, e.name)))
    .sort()
    .map((rel) => ({ name: path.basename(rel, ".tsx"), path: rel, href: editorHref(rel) }));
}

function count(dir: string): number {
  return components(dir).length;
}

/**
 * The inventory is read from disk when the page renders, so a new component file shows up without
 * editing this list. App-local folders are listed only where they hold reusable pieces; feature
 * folders (sections, proposal views) are counted in a note instead.
 */
function inventory(): InventoryGroup[] {
  const www = "apps/www/components";
  const admin = "apps/admin/components";
  return [
    { id: "ui", title: "@repo/ui", items: components("packages/ui/src/components") },
    { id: "ui-www", title: "@repo/ui/www", note: "The site dialect.", items: components("packages/ui/src/www") },
    {
      id: "www",
      title: "apps/www",
      note: `Reusable pieces only. ${count(`${www}/sections`)} section files are page compositions and are not listed.`,
      items: [
        ...components(www, false),
        ...["base", "ui", "shared", "interactive", "layout"].flatMap((d) => components(`${www}/${d}`)),
      ],
    },
    {
      id: "admin",
      title: "apps/admin",
      note: `Reusable pieces only. ${count(`${admin}/proposal`) + count(`${admin}/security`) + count(`${admin}/today`)} feature files (proposal, security, today) are not listed.`,
      items: [...components(admin, false), ...["os", "ui", "shell"].flatMap((d) => components(`${admin}/${d}`))],
    },
  ];
}

export default function BoardPage(): React.ReactElement {
  const hrefs = Object.fromEntries(
    Object.entries(BOARD_SOURCES).map(([key, rel]) => [key, editorHref(rel)]),
  ) as Record<SourceKey, string>;

  return <Board hrefs={hrefs} groups={inventory()} />;
}
