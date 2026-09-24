"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { getLenis } from "@/lib/motion/lenis-instance";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";

type ContentsRailItem = {
  /** Element id of the target section. */
  id: string;
  label: string;
  /** Printed after the label, e.g. how many questions a topic holds. */
  count?: number;
};

type ContentsRailProps = {
  title: string;
  items: ContentsRailItem[];
  className?: string;
};

/** Clears the fixed nav when a section is scrolled to. */
const SCROLL_OFFSET = 112;

/**
 * Moves to an in-page section from an `#id` link: through Lenis when Lenis
 * owns the scroll (a native jump underneath it is overwritten on the next
 * frame), clearing the fixed nav, and moving focus so keyboard and screen
 * reader users land where the eye does. Returns false when the target is
 * missing, leaving the browser's own anchor jump to happen.
 */
export function jumpToSection(
  event: MouseEvent<HTMLAnchorElement>,
  id: string,
) {
  const target = document.getElementById(id);
  if (!target) return false;
  event.preventDefault();
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset: -SCROLL_OFFSET });
  } else {
    const top =
      target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top });
  }
  history.replaceState(null, "", `#${id}`);
  target.focus({ preventScroll: true });
  return true;
}

/**
 * A long reference page's table of contents: a sticky rail on wide screens,
 * a native disclosure above the content below `lg`. The active entry follows
 * the section crossing the upper third of the viewport.
 *
 * Links are real `#id` anchors, so they work with JavaScript off.
 */
export function ContentsRail({ title, items, className }: ContentsRailProps) {
  const locale = useLocale();
  const [activeId, setActiveId] = useState(items[0]?.id);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) return;
        const [first] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
        setActiveId(first[0]);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (jumpToSection(event, id)) setActiveId(id);
  };

  const list = (
    <ol className="space-y-0.5">
      {items.map((item, index) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(event) => jump(event, item.id)}
              aria-current={active ? "location" : undefined}
              className={cn(
                "group relative grid min-h-10 grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-2 ps-4 text-sm leading-snug transition-colors",
                "before:absolute before:inset-y-2 before:start-0 before:w-px before:transition-colors",
                active
                  ? "text-foreground before:bg-foreground"
                  : "text-muted-foreground before:bg-border-subtle hover:text-foreground",
              )}
            >
              <span aria-hidden className="tabular-nums ltr:font-mono ltr:text-xs">
                {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
              </span>
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span className="tabular-nums text-xs text-muted-foreground ltr:font-mono">
                  {localizeNumbers(String(item.count), locale)}
                </span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav aria-label={title} className={className}>
      <details className="group/contents border-y border-border-subtle lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
          <Eyebrow className="m-0">{title}</Eyebrow>
          <ChevronDown
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-open/contents:rotate-180"
          />
        </summary>
        <div className="pb-4">{list}</div>
      </details>

      <div className="hidden lg:sticky lg:top-28 lg:block">
        <Eyebrow className="mb-5">{title}</Eyebrow>
        {list}
      </div>
    </nav>
  );
}
