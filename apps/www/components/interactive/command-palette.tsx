"use client";

import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { usePathname, useRouter } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import { MOTION } from "@/lib/motion";
import { SITE_CONFIG } from "@/lib/metadata";
import { gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import {
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  Languages,
  MoonStar,
  Search,
  SunMedium,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentType,
} from "react";

type PaletteGroup = "actions" | "pages" | "services";

type PaletteItem = {
  id: string;
  group: PaletteGroup;
  label: string;
  /** Extra strings the fuzzy matcher may hit (other-locale label, synonyms). */
  keywords: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  action?: "theme" | "language" | "copyEmail";
};

/**
 * Subsequence fuzzy score. 0 = no match. Higher = better.
 * Bonuses: consecutive runs, word-start hits, early first match.
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  let firstHit = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (firstHit < 0) firstHit = ti;
      const wordStart = ti === 0 || t[ti - 1] === " " || t[ti - 1] === "/";
      streak += 1;
      score += 2 + streak + (wordStart ? 4 : 0);
      qi++;
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return 0;
  return score + Math.max(0, 12 - firstHit);
}

const GROUP_ORDER: PaletteGroup[] = ["actions", "pages", "services"];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { setTheme, resolvedTheme } = useTheme();
  const [, startTransition] = useTransition();

  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);

  useLockBodyScroll(open);

  const items = useMemo<PaletteItem[]>(() => {
    const isDark = resolvedTheme === "dark";
    return [
      {
        id: "action-theme",
        group: "actions",
        label: isDark ? t("actions.themeLight") : t("actions.themeDark"),
        keywords: "theme dark light mode مظهر داكن فاتح الوضع",
        icon: isDark ? SunMedium : MoonStar,
        action: "theme",
      },
      {
        id: "action-language",
        group: "actions",
        label: locale === "ar" ? "English" : "العربية",
        keywords: "language english arabic عربي انجليزي اللغة locale",
        icon: Languages,
        action: "language",
      },
      {
        id: "action-schedule",
        group: "actions",
        label: t("actions.schedule"),
        keywords: "schedule call meeting book موعد مكالمة حجز",
        icon: Calendar,
        href: "/schedule",
      },
      {
        id: "action-email",
        group: "actions",
        label: copied ? t("actions.copied") : t("actions.copyEmail"),
        keywords: "email copy mail بريد ايميل نسخ " + SITE_CONFIG.email,
        icon: copied ? Check : Copy,
        action: "copyEmail",
      },
      { id: "page-home", group: "pages", label: t("pages.home"), keywords: "home start الرئيسية البداية", href: "/" },
      { id: "page-work", group: "pages", label: tNav("work"), keywords: "work case studies portfolio اعمال مشاريع", href: "/work" },
      { id: "page-services", group: "pages", label: tNav("services"), keywords: "services خدمات", href: "/services" },
      { id: "page-pricing", group: "pages", label: tNav("pricing"), keywords: "pricing cost اسعار تكلفة", href: "/pricing" },
      { id: "page-transparency", group: "pages", label: tNav("transparency"), keywords: "transparency estimate estimator شفافية تقدير", href: "/transparency" },
      { id: "page-contact", group: "pages", label: tNav("contact"), keywords: "contact reach تواصل اتصل", href: "/contact" },
      { id: "page-about", group: "pages", label: tNav("about"), keywords: "about company founder من نحن عن", href: "/about" },
      { id: "page-approach", group: "pages", label: tNav("approach"), keywords: "approach philosophy منهج فلسفة", href: "/approach" },
      { id: "page-how", group: "pages", label: tNav("how-we-work"), keywords: "how we work method كيف نعمل", href: "/how-we-work" },
      { id: "page-process", group: "pages", label: tNav("process"), keywords: "process phases عملية مراحل", href: "/process" },
      { id: "page-standards", group: "pages", label: tFooter("standards"), keywords: "standards quality معايير جودة", href: "/standards" },
      { id: "page-writing", group: "pages", label: tFooter("writing"), keywords: "writing blog articles مقالات كتابة", href: "/writing" },
      { id: "page-faq", group: "pages", label: tFooter("faq"), keywords: "faq questions اسئلة", href: "/faq" },
      { id: "svc-interface", group: "services", label: tFooter("webDesign"), keywords: "interface design ui ux تصميم واجهات", href: "/services/interface-design" },
      { id: "svc-development", group: "services", label: tFooter("development"), keywords: "development engineering تطوير برمجة", href: "/services/development" },
      { id: "svc-ecommerce", group: "services", label: tFooter("ecommerce"), keywords: "ecommerce store shop متجر تجارة", href: "/services/ecommerce" },
      { id: "svc-consulting", group: "services", label: tFooter("consulting"), keywords: "consulting audit استشارات", href: "/services/consulting" },
      { id: "svc-maintenance", group: "services", label: tFooter("maintenance"), keywords: "maintenance support صيانة دعم", href: "/services/maintenance" },
    ];
  }, [t, tNav, tFooter, locale, resolvedTheme, copied]);

  const results = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(query, item.label),
          fuzzyScore(query, item.keywords) * 0.75,
        ),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [items, query]);

  const grouped = useMemo(() => {
    // Preserve result (relevance) order inside each group; groups keep a
    // stable order so the layout doesn't jump while typing.
    return GROUP_ORDER.map((group) => ({
      group,
      items: results.filter((i) => i.group === group),
    })).filter((g) => g.items.length > 0);
  }, [results]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const clampedActive = Math.min(activeIndex, Math.max(0, flat.length - 1));
  const activeItem = flat[clampedActive];

  // ── Open/close lifecycle: focus capture + GSAP entrance ──────────────────
  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => inputRef.current?.focus());

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (backdrop && panel) {
      if (reduce) {
        gsap.fromTo(
          [backdrop, panel],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.15, ease: "power1.out" },
        );
      } else {
        gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "power2.out" });
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: 10, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: MOTION.ease.strong },
        );
      }
    }
    trackEvent("command_palette_opened");
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      // Reset here (an event path, not an effect) so the next open starts clean.
      setQuery("");
      setActiveIndex(0);
      setCopied(false);
      restoreFocusRef.current?.focus?.();
      onClose();
    };
    if (!backdrop || !panel || reduce) {
      finish();
      return;
    }
    gsap.to(backdrop, { autoAlpha: 0, duration: 0.18, ease: "power1.in" });
    gsap.to(panel, {
      autoAlpha: 0,
      y: 6,
      scale: 0.99,
      duration: 0.18,
      ease: MOTION.ease.exit,
      onComplete: finish,
    });
  }, [onClose]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const runItem = useCallback(
    (item: PaletteItem) => {
      trackEvent("command_palette_select", { id: item.id });
      if (item.action === "theme") {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        return; // stay open — the theme change is the feedback
      }
      if (item.action === "language") {
        const next = locale === "ar" ? "en" : "ar";
        startTransition(() => {
          router.replace(
            // @ts-expect-error -- pathname is dynamic at runtime, not a typed route literal
            { pathname, params },
            { locale: next },
          );
        });
        animateClose();
        return;
      }
      if (item.action === "copyEmail") {
        navigator.clipboard?.writeText(SITE_CONFIG.email).then(() => {
          setCopied(true);
          window.setTimeout(() => animateClose(), 900);
        });
        return;
      }
      if (item.href) {
        router.push(item.href as Parameters<typeof router.push>[0]);
        animateClose();
      }
    },
    [setTheme, resolvedTheme, locale, router, pathname, params, animateClose],
  );

  // ── Keyboard model: focus stays in the input (trap), arrows move the
  //    active descendant, Tab is captured so focus can never escape. ─────────
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        animateClose();
        return;
      }
      if (flat.length === 0) return;
      const move = (delta: number) => {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = (Math.min(prev, flat.length - 1) + delta + flat.length) % flat.length;
          return next;
        });
      };
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) move(1);
      else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) move(-1);
      else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(flat.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeItem) runItem(activeItem);
      }
    },
    [flat.length, activeItem, runItem, animateClose],
  );

  // Keep the active option in view as the selection moves.
  useEffect(() => {
    if (!open || !activeItem) return;
    const el = listRef.current?.querySelector(`[data-item-id="${activeItem.id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeItem, clampedActive]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      dir={dir}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]"
      role="presentation"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={animateClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl liquid-glass shadow-2xl shadow-foreground/10 will-change-transform"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={activeItem ? `cp-${activeItem.id}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
          <kbd className="hidden sm:flex shrink-0 items-center rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label={t("title")}
          data-lenis-prevent
          className="max-h-[min(52vh,380px)] overflow-y-auto overscroll-contain p-2"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            grouped.map(({ group, items: groupItems }) => (
              <div key={group} role="group" aria-label={t(`groups.${group}`)}>
                <p className="px-3 pb-1.5 pt-3 text-[10px] text-muted-foreground/80">
                  {t(`groups.${group}`)}
                </p>
                {groupItems.map((item) => {
                  const isActive = activeItem?.id === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`cp-${item.id}`}
                      data-item-id={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      onClick={() => runItem(item)}
                      onPointerMove={() => {
                        const idx = flat.findIndex((f) => f.id === item.id);
                        if (idx >= 0 && idx !== clampedActive) setActiveIndex(idx);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors duration-150",
                        isActive
                          ? "bg-foreground/8 text-foreground"
                          : "text-foreground/70",
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-muted-foreground/60 rtl:-scale-x-100"
                          aria-hidden
                        />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <kbd className="shrink-0 text-[10px] text-muted-foreground/70">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-[10px] text-muted-foreground/70">
            {t("hint")}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground/70">
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">↑</kbd>
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">↓</kbd>
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">↵</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
