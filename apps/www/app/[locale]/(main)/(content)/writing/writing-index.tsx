"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { Link } from "@/i18n/navigation";
import { MOTION, useSectionCardGrid } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import type { ArticleListItem, ArticleTopic } from "@/types/mdx";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LOCALE_META, type Locale } from "@/i18n/locale-meta";

type Filter = "all" | ArticleTopic;
type Active = { slug: string; from: "pointer" | "focus" } | null;

const FILTERS: Filter[] = ["all", "choose", "build"];
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const PEEK_OFFSET = 28;
const PEEK_MARGIN = 12;
const NAV_CLEARANCE = 76;
const PEEK_MAX_ITEMS = 5;

type WritingIndexProps = {
  articles: ArticleListItem[];
  locale: Locale;
};

export function WritingIndex({ articles, locale }: WritingIndexProps) {
  const t = useTranslations("writing");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-article]",
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Active>(null);
  const [peekSlug, setPeekSlug] = useState<string | null>(null);

  const peekRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const focusRow = useRef<HTMLElement | null>(null);
  const visible = useRef(false);
  const movers = useRef<{
    x: (v: number, start?: number) => void;
    y: (v: number, start?: number) => void;
  } | null>(null);

  const rtl = LOCALE_META[locale].dir === "rtl";
  const shown = articles.filter(
    (a) => filter === "all" || a.frontmatter.topic === filter,
  );
  const countFor = (f: Filter) =>
    f === "all"
      ? articles.length
      : articles.filter((a) => a.frontmatter.topic === f).length;
  const peekArticle = articles.find((a) => a.slug === peekSlug);
  const open = (slug: string, from: "pointer" | "focus") => {
    setPeekSlug(slug);
    setActive({ slug, from });
  };

  useIsomorphicLayoutEffect(() => {
    const el = peekRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        if (ctx.conditions?.reduced) {
          movers.current = {
            x: (v) => gsap.set(el, { x: v }),
            y: (v) => gsap.set(el, { y: v }),
          };
          return;
        }
        const opts = {
          duration: MOTION.duration.fast,
          ease: MOTION.ease.strong,
        };
        movers.current = {
          x: gsap.quickTo(el, "x", opts),
          y: gsap.quickTo(el, "y", opts),
        };
      },
    );
    return () => {
      mm.revert();
      movers.current = null;
    };
  }, []);

  const place = (snap: boolean, from: "pointer" | "focus" = "pointer") => {
    const el = peekRef.current;
    const move = movers.current;
    if (!el || !move) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let px: number;
    let py: number;
    const row = focusRow.current?.getBoundingClientRect();
    if (from === "focus" && row) {
      px = rtl ? row.left : row.right - w;
      py = row.bottom + PEEK_MARGIN;
      if (py + h > window.innerHeight - PEEK_MARGIN)
        py = row.top - h - PEEK_MARGIN;
    } else {
      const { x: cx, y: cy } = pointer.current;
      px = rtl ? cx - w - PEEK_OFFSET : cx + PEEK_OFFSET;
      py = cy - h / 2;
    }
    px = Math.max(
      PEEK_MARGIN,
      Math.min(window.innerWidth - w - PEEK_MARGIN, px),
    );
    py = Math.max(
      NAV_CLEARANCE,
      Math.min(window.innerHeight - h - PEEK_MARGIN, py),
    );
    if (snap) {
      move.x(px, px);
      move.y(py, py);
    } else {
      move.x(px);
      move.y(py);
    }
  };

  useIsomorphicLayoutEffect(() => {
    if (!active) {
      visible.current = false;
      return;
    }
    place(!visible.current || active.from === "focus", active.from);
    visible.current = true;
    if (active.from !== "focus") return;
    const follow = () => place(true, "focus");
    gsap.ticker.add(follow);
    return () => gsap.ticker.remove(follow);
  }, [active]);

  const finePointer = () => window.matchMedia(FINE_POINTER).matches;

  const onFilter = (next: Filter) => {
    setFilter(next);
    setActive(null);
    const rows = sectionRef.current?.querySelectorAll<HTMLElement>("[data-article]");
    if (rows?.length) gsap.set(rows, { opacity: 1, x: 0, y: 0, clearProps: "willChange,transform" });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  return (
    <section
      ref={sectionRef}
      className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground pt-5">
          <div
            role="group"
            aria-label={t("index.filterLabel")}
            className="flex flex-wrap gap-1.5"
          >
            {FILTERS.map((f) => {
              const pressed = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onFilter(f)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-colors duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                    pressed
                      ? "bg-foreground text-background"
                      : "text-muted-foreground ring-1 ring-inset ring-foreground/45 hover:text-foreground",
                  )}
                >
                  {f === "all" ? t("index.all") : t(`index.topics.${f}`)}
                  <sup className="ms-1 text-micro">
                    <Num value={countFor(f)} />
                  </sup>
                </button>
              );
            })}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {localizeNumbers(t("index.count", { count: shown.length }), locale)}
          </span>
        </div>

        <ol>
          {articles.map((article, i) => {
            const { slug, frontmatter } = article;
            const show = filter === "all" || frontmatter.topic === filter;
            const current = active?.slug === slug;
            const quiet = active !== null && !current;
            return (
              <li
                key={slug}
                data-article
                hidden={!show}
                className="border-b border-border-subtle"
              >
                <Link
                  href={`/writing/${slug}`}
                  onPointerEnter={(e) => {
                    if (
                      e.pointerType !== "mouse" ||
                      !finePointer() ||
                      active?.from === "focus"
                    )
                      return;
                    pointer.current = { x: e.clientX, y: e.clientY };
                    open(slug, "pointer");
                  }}
                  onPointerMove={(e) => {
                    if (e.pointerType !== "mouse" || !finePointer()) return;
                    pointer.current = { x: e.clientX, y: e.clientY };
                    if (active?.from === "pointer" && active.slug === slug)
                      place(false);
                    else open(slug, "pointer");
                  }}
                  onPointerLeave={() =>
                    setActive((a) => (a?.from === "pointer" ? null : a))
                  }
                  onFocus={(e) => {
                    if (
                      !e.currentTarget.matches(":focus-visible") ||
                      !finePointer()
                    )
                      return;
                    focusRow.current = e.currentTarget;
                    open(slug, "focus");
                  }}
                  onBlur={() =>
                    setActive((a) => (a?.from === "focus" ? null : a))
                  }
                  className="grid grid-cols-[36px_minmax(0,1fr)] items-baseline gap-x-6 gap-y-2 py-[clamp(18px,2.6vh,28px)] md:grid-cols-[56px_minmax(0,1fr)_auto]"
                >
                  <span
                    className={cn(
                      "text-sm transition-colors duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                      current ? "text-brand-text" : "text-muted-foreground",
                    )}
                  >
                    <Num value={i + 1} pad={2} />
                  </span>
                  <h2
                    className={cn(
                      "text-[clamp(26px,3.6vw,54px)] leading-[1.08] font-normal tracking-[-0.03em] rtl:leading-[1.4] rtl:tracking-normal",
                      "transition-colors duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                      quiet ? "text-foreground/50" : "text-foreground",
                    )}
                  >
                    {frontmatter.title}
                  </h2>
                  <span className="col-start-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground md:col-start-3 md:block md:whitespace-nowrap md:row-start-1 md:text-end">
                    {frontmatter.featured && (
                      <small className="text-md whitespace-nowrap text-brand-text md:block">
                        {t("index.startHere")}
                      </small>
                    )}
                    {/* Below md the three parts share one line and wrap between
                        parts, not inside one: a single nowrap line ran past the
                        title column at 320px in Arabic. */}
                    <span className="whitespace-nowrap">
                      {t("readTime", {
                        count: frontmatter.readTimeMinutes,
                        minutes: localizeNumbers(
                          String(frontmatter.readTimeMinutes),
                          locale,
                        ),
                      })}
                    </span>
                    <small className="text-md whitespace-nowrap text-muted-foreground md:block">
                      {new Date(frontmatter.date).toLocaleDateString(
                        LOCALE_META[locale].intl,
                        { year: "numeric", month: "long" },
                      )}
                    </small>
                  </span>
                  <p className="col-start-2 hidden max-w-[60ch] text-base text-muted-foreground pointer-coarse:block [@media(hover:none)]:block">
                    {frontmatter.excerpt}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </Container>

      <div
        ref={peekRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 w-80 pointer-coarse:hidden [@media(hover:none)]:hidden"
      >
        <div
          className={cn(
            "rounded-panel-sm border border-border-subtle bg-card px-5 pt-[18px] pb-3.5 shadow-card-lg",
            "transition-[opacity,scale] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
            active ? "scale-100 opacity-100" : "scale-[0.96] opacity-0",
          )}
        >
          {peekArticle && (
            <>
              <Eyebrow>
                {t("index.inside")} ·{" "}
                {localizeNumbers(
                  t("index.sections", { count: peekArticle.headings.length }),
                  locale,
                )}
              </Eyebrow>
              <ol className="mt-3 border-t border-border-subtle">
                {peekArticle.headings
                  .slice(0, PEEK_MAX_ITEMS)
                  .map((heading, n) => (
                    <li
                      key={heading}
                      className="grid grid-cols-[26px_1fr] border-b border-border-subtle py-[7px] text-sm leading-[1.4] last:border-b-0"
                    >
                      <span className="pt-0.5 text-xs text-muted-foreground">
                        <Num value={n + 1} pad={2} />
                      </span>
                      {heading}
                    </li>
                  ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
