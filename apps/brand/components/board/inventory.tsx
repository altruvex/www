"use client";

import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui";
import { ArrowUpRight, Crosshair } from "lucide-react";
import { BOARD_SOURCES, type SourceKey } from "@/lib/board-sources";
import { cn } from "@/lib/cn";
import { LABEL, Widget, useT } from "./kit";

export interface InventoryItem {
  name: string;
  path: string;
  href: string;
}

export interface InventoryGroup {
  id: string;
  title: string;
  note?: string;
  items: InventoryItem[];
}

const KEYS = Object.keys(BOARD_SOURCES) as SourceKey[];

/**
 * Every component file in the repo, grouped by where it lives, with what the board shows of it.
 * The file lists come from disk on each request; "on the board" is read from the widgets
 * themselves (`figure[data-uses]`), so the count cannot drift from what is rendered.
 */
export function InventoryWidget({ groups }: { groups: InventoryGroup[] }): React.ReactElement {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Map<string, HTMLElement> | null>(null);

  useEffect(() => {
    const own = root.current?.closest("figure");
    const found = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>("#board figure[data-uses]").forEach((figure) => {
      if (figure === own) return;
      for (const key of figure.dataset.uses?.split(" ") ?? []) {
        const path = KEYS.includes(key as SourceKey) ? BOARD_SOURCES[key as SourceKey] : null;
        if (path && !found.has(path)) found.set(path, figure);
      }
    });
    setShown(found);
  }, []);

  function show(path: string): void {
    const figure = shown?.get(path);
    const board = document.getElementById("board");
    if (!figure || !board) return;
    // Scroll the canvas only: scrollIntoView would also pan the page itself.
    const f = figure.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    board.scrollTo({
      left: board.scrollLeft + f.left - b.left - Math.max(24, (b.width - f.width) / 2),
      top: board.scrollTop + f.top - b.top - Math.max(24, (b.height - f.height) / 2),
      behavior: still ? "auto" : "smooth",
    });
    figure.dataset.flash = "true";
    window.setTimeout(() => delete figure.dataset.flash, 1600);
  }

  return (
    <Widget
      title={t("Inventory", "الجرد")}
      description={t("Every component file, and where it shows here", "كل ملف مكوّن، وأين يظهر هنا")}
      uses={["accordion"]}
      use="The map of the system. Each group is read from disk, so a new file appears here on the next load. A row on the board jumps to the widget that uses it; a row off the board opens the file."
      avoid="Treating a missing row as a bug by default: app-local pieces belong to their screens. A missing @repo/ui row is a gap in the board."
    >
      <div ref={root}>
        <Accordion type="multiple" defaultValue={[groups[0]?.id ?? ""]}>
          {groups.map((group) => {
            const on = shown ? group.items.filter((item) => shown.has(item.path)).length : null;
            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pe-2">
                    <span className="truncate" dir="ltr">
                      {group.title}
                    </span>
                    <span className="shrink-0 text-meta tabular-nums text-muted-foreground" dir="ltr">
                      {on ?? "–"} / {group.items.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {group.note && <p className="mb-2 text-meta text-muted-foreground">{group.note}</p>}
                  <ul className="grid">
                    {group.items.map((item) => {
                      const here = shown?.has(item.path) ?? false;
                      const row =
                        "flex w-full items-center gap-2 rounded-ctl-sm px-2 py-1.5 text-start text-md transition-colors duration-(--motion-hover) hover:bg-foreground/4";
                      const dot = (
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            here ? "bg-foreground" : "border border-foreground/45",
                          )}
                        />
                      );
                      return (
                        <li key={item.path}>
                          {here ? (
                            <button type="button" title={item.path} onClick={() => show(item.path)} className={row}>
                              {dot}
                              <span className="min-w-0 flex-1 truncate" dir="ltr">
                                {item.name}
                              </span>
                              <Crosshair className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                              <span className="sr-only">{t("Show on the board", "اعرضه على اللوحة")}</span>
                            </button>
                          ) : (
                            <a href={item.href} title={item.path} className={cn(row, "text-muted-foreground")}>
                              {dot}
                              <span className="min-w-0 flex-1 truncate" dir="ltr">
                                {item.name}
                              </span>
                              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                              <span className="sr-only">{t("Not on the board — open the file", "ليس على اللوحة — افتح الملف")}</span>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        <p className={cn(LABEL, "mt-4 flex items-center gap-3")}>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-foreground" />
            {t("on the board", "على اللوحة")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full border border-foreground/45" />
            {t("file only", "ملف فقط")}
          </span>
        </p>
      </div>
    </Widget>
  );
}
