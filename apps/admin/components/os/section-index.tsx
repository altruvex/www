"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DossierSectionDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

const LG = "(min-width: 1024px)";

function subscribeLg(onChange: () => void) {
  const query = window.matchMedia(LG);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useLg() {
  return React.useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG).matches,
    () => true,
  );
}

function pxVar(name: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function Dossier({
  sections,
  aside,
  children,
  label = "Sections",
  className,
}: {
  sections: DossierSectionDef[];
  aside?: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const lg = useLg();
  const [active, setActive] = React.useState(sections[0]?.id ?? "");
  const navRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLOListElement>(null);
  const lockRef = React.useRef<string | null>(null);
  const ids = sections.map((section) => section.id).join("|");

  React.useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hash && ids.split("|").includes(hash)) setActive(hash);
  }, [ids]);

  React.useEffect(() => {
    const list = ids ? ids.split("|") : [];
    const elements = list
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const top =
      pxVar("--topbar-h", 48) + (lg ? 16 : (navRef.current?.offsetHeight ?? 0) + 8);
    const visible = new Set<string>();

    const pick = () => {
      if (lockRef.current) return;
      const first = list.find((id) => visible.has(id));
      if (first) setActive(first);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        pick();
      },
      { rootMargin: `-${Math.round(top)}px 0px -55% 0px`, threshold: 0 },
    );
    for (const el of elements) observer.observe(el);

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (lockRef.current) return;
        const atBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atBottom && window.scrollY > 0) setActive(list[list.length - 1]);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ids, lg]);

  React.useEffect(() => {
    const row = listRef.current;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const link = row.querySelector<HTMLElement>('[aria-current="location"]');
    if (!link) return;
    const rowBox = row.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    if (box.left < rowBox.left + 12 || box.right > rowBox.right - 12) {
      row.scrollBy({ left: box.left - rowBox.left - 12, behavior: "smooth" });
    }
  }, [active]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setActive(id);
    lockRef.current = id;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      lockRef.current = null;
      window.removeEventListener("scrollend", release);
    };
    window.addEventListener("scrollend", release, { once: true });
    window.setTimeout(release, reduce ? 50 : 900);

    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
    window.history.replaceState(window.history.state, "", `#${id}`);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-x-8",
        aside && "xl:grid-cols-[180px_minmax(0,1fr)_280px]",
        className,
      )}
    >
      <nav
        ref={navRef}
        aria-label={label}
        className={cn(
          "sticky top-[var(--topbar-h)] z-20 -mx-3 min-w-0 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:-mx-4 sm:px-4",
          "lg:top-[calc(var(--topbar-h)+1rem)] lg:z-auto lg:col-start-1 lg:row-start-1 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none",
          aside && "lg:row-span-2 xl:row-span-1",
        )}
      >
        <ol
          ref={listRef}
          className="flex gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:py-0 [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((section) => {
            const isActive = section.id === active;
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  onClick={(event) => jump(event, section.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "flex h-[var(--control-h-sm)] items-center gap-2 whitespace-nowrap rounded-md border px-2.5 text-base no-underline pointer-coarse:h-9",
                    "transition-colors duration-[var(--dur-state)] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    "lg:w-full lg:border-transparent lg:px-2 [&_svg]:size-3.5 [&_svg]:shrink-0",
                    isActive
                      ? "border-border-mid bg-surface font-medium text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground lg:hover:bg-surface/60",
                  )}
                >
                  {section.icon && (
                    <span
                      className={cn(
                        "flex",
                        isActive ? "text-foreground" : "text-subtle-foreground",
                      )}
                      aria-hidden
                    >
                      {section.icon}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{section.label}</span>
                  {section.count != null && section.count > 0 && (
                    <span className="font-mono text-micro tabular-nums text-subtle-foreground lg:ms-auto">
                      {section.count}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {aside && (
        <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 xl:sticky xl:top-[calc(var(--topbar-h)+1rem)] xl:col-start-3 xl:self-start">
          {aside}
        </aside>
      )}

      <div
        className={cn(
          "min-w-0 lg:col-start-2",
          aside ? "lg:row-start-2 xl:row-start-1" : "lg:row-start-1",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DossierSection({
  id,
  title,
  action,
  description,
  children,
  className,
}: {
  id: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "scroll-mt-[calc(var(--topbar-h)+3.75rem)] border-t border-border py-6 outline-none first:border-t-0 first:pt-0 lg:scroll-mt-[calc(var(--topbar-h)+1rem)]",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-md font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-meta text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
