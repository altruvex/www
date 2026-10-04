"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { getLenis } from "@/lib/motion/lenis-instance";
import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";

type ContentsRailItem = {
  id: string;
  label: string;
  count?: number;
};

type ContentsRailProps = {
  title: string;
  items: ContentsRailItem[];
  className?: string;
};

const SCROLL_OFFSET = 112;

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
                {formatIndex(index + 1, 2, locale)}
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
