"use client";

import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { ArrowIcon, Dialog, DialogContent, DialogTitle } from "@repo/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import { MOTION, useThemeSwitch } from "@/lib/motion";
import { getCommercialCta } from "@/lib/config/commercial";
import { SITE_CONFIG } from "@/lib/metadata";
import { gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import {
  Calculator,
  Calendar,
  Check,
  ClipboardCheck,
  Copy,
  Languages,
  MessageSquareText,
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
import { LOCALE_META, localeMeta, nextLocale } from "@/i18n/locale-meta";

type PaletteGroup = "actions" | "pages" | "services";

type PaletteItem = {
  id: string;
  group: PaletteGroup;
  label: string;
  keywords: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  action?: "theme" | "language" | "copyEmail";
};

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
  const tCTAs = useTranslations("commercial.ctas");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { resolvedTheme } = useTheme();
  const switchTheme = useThemeSwitch();
  const [, startTransition] = useTransition();

  const dir = localeMeta(locale).dir;

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // Radix locks the page scroll once its portal mounts, a commit after this hook has
  // already locked it, so the scrollbar gutter is compensated once. The hook is what stops Lenis.
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
        label: LOCALE_META[nextLocale(locale)].nativeName,
        keywords: "language english arabic عربي انجليزي اللغة locale",
        icon: Languages,
        action: "language",
      },
      {
        id: "action-start",
        group: "actions",
        label: tCTAs("describeTheBuild"),
        keywords: "start project brief inquiry contact hire ابدأ مشروع تواصل استفسار",
        icon: MessageSquareText,
        href: getCommercialCta("describeTheBuild").href,
      },
      {
        id: "action-audit",
        group: "actions",
        label: tCTAs("technicalAudit"),
        keywords: "technical audit review code audit rebuild repair مراجعة تقنية تدقيق فحص",
        icon: ClipboardCheck,
        href: getCommercialCta("technicalAudit").href,
      },
      {
        id: "action-schedule",
        group: "actions",
        label: t("actions.schedule"),
        keywords: "schedule consultation call meeting book موعد مكالمة حجز استشارة",
        icon: Calendar,
        href: getCommercialCta("technicalCall").href,
      },
      {
        id: "action-estimate",
        group: "actions",
        label: t("actions.estimate"),
        keywords: "estimate estimator calculator cost price budget quote range تقدير حاسبة تكلفة ميزانية سعر",
        icon: Calculator,
        href: getCommercialCta("projectRange").href,
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
      { id: "page-transparency", group: "pages", label: `${tNav("transparency")} · ${tNav("transparencyHint")}`, keywords: "transparency cost estimator calculator price estimate شفافية حاسبة التكلفة تقدير سعر", href: "/transparency" },
      { id: "page-contact", group: "pages", label: tNav("contact"), keywords: "contact reach تواصل اتصل", href: "/contact" },
      { id: "page-about", group: "pages", label: tNav("about"), keywords: "about company founder من نحن عن", href: "/about" },
      { id: "page-approach", group: "pages", label: tNav("approach"), keywords: "approach philosophy منهج فلسفة", href: "/approach" },
      { id: "page-how", group: "pages", label: tNav("how-we-work"), keywords: "how we work method كيف نعمل", href: "/how-we-work" },
      { id: "page-process", group: "pages", label: tNav("process"), keywords: "process phases عملية مراحل", href: "/process" },
      { id: "page-standards", group: "pages", label: tFooter("standards"), keywords: "standards quality معايير جودة", href: "/standards" },
      { id: "page-writing", group: "pages", label: tFooter("writing"), keywords: "writing blog articles مقالات كتابة", href: "/writing" },
      { id: "page-faq", group: "pages", label: tFooter("faq"), keywords: "faq questions اسئلة", href: "/faq" },
      { id: "page-privacy", group: "pages", label: tFooter("privacy"), keywords: "privacy data personal خصوصية بيانات", href: "/privacy" },
      { id: "page-terms", group: "pages", label: tFooter("terms"), keywords: "terms conditions contract legal شروط عقد", href: "/terms" },
      { id: "svc-interface", group: "services", label: tFooter("webDesign"), keywords: "website design interface ui ux تصميم المواقع واجهات", href: "/services/interface-design" },
      { id: "svc-development", group: "services", label: tFooter("development"), keywords: "website web app development engineering تطوير برمجة مواقع تطبيقات ويب", href: "/services/development" },
      { id: "svc-consulting", group: "services", label: tFooter("consulting"), keywords: "technical audit consulting review مراجعة تقنية استشارات", href: "/services/consulting" },
      { id: "svc-maintenance", group: "services", label: tFooter("maintenance"), keywords: "website maintenance support صيانة المواقع دعم", href: "/services/maintenance" },
    ];
  }, [t, tNav, tFooter, tCTAs, locale, resolvedTheme, copied]);

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
    return GROUP_ORDER.map((group) => ({
      group,
      items: results.filter((i) => i.group === group),
    })).filter((g) => g.items.length > 0);
  }, [results]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const clampedActive = Math.min(activeIndex, Math.max(0, flat.length - 1));
  const activeItem = flat[clampedActive];

  // Runs once the portal content exists (Radix mounts it a commit after `open` flips), so the
  // refs are set; it replaces Radix's own first-tabbable focus with the search field.
  const onOpened = useCallback((event: Event) => {
    event.preventDefault();
    closingRef.current = false;
    inputRef.current?.focus();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (backdrop && panel) {
      if (reduce) {
        gsap.fromTo(
          [backdrop, panel],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: MOTION.duration.hover, ease: MOTION.ease.fade },
        );
      } else {
        gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: MOTION.duration.drawer, ease: MOTION.ease.fade });
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: MOTION.distance.xs, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: MOTION.duration.drawer, ease: MOTION.ease.strong },
        );
      }
    }
  }, []);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setQuery("");
      setActiveIndex(0);
      setCopied(false);
      onClose();
    };
    if (!backdrop || !panel || reduce) {
      finish();
      return;
    }
    gsap.to(backdrop, { autoAlpha: 0, duration: MOTION.duration.instant, ease: MOTION.ease.fadeOut });
    gsap.to(panel, {
      autoAlpha: 0,
      y: MOTION.distance.xs,
      scale: 0.99,
      duration: MOTION.duration.instant,
      ease: MOTION.ease.exit,
      onComplete: finish,
    });
  }, [onClose]);

  const runItem = useCallback(
    (item: PaletteItem) => {
      trackEvent("cta_clicked", { ctaId: item.id, source: "command_palette" });
      if (item.action === "theme") {
        switchTheme(resolvedTheme === "dark" ? "light" : "dark");
        return;
      }
      if (item.action === "language") {
        const next = nextLocale(locale);
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
    [switchTheme, resolvedTheme, locale, router, pathname, params, animateClose],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    [flat.length, activeItem, runItem],
  );

  useEffect(() => {
    if (!open || !activeItem) return;
    const el = listRef.current?.querySelector(`[data-item-id="${activeItem.id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeItem, clampedActive]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && animateClose()}>
      <DialogContent
        ref={panelRef}
        overlayRef={backdropRef}
        surface="glass"
        placement="top"
        dir={dir}
        aria-describedby={undefined}
        onOpenAutoFocus={onOpened}
        className="mt-[14vh] max-w-xl sm:mt-[18vh]"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
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
          <kbd className="hidden sm:flex shrink-0 items-center rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-micro text-muted-foreground">
            esc
          </kbd>
        </div>
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label={t("title")}
          data-lenis-prevent
          className="max-h-[min(52vh,380px)] overflow-y-auto overscroll-contain p-3"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            grouped.map(({ group, items: groupItems }) => (
              <div key={group} role="group" aria-label={t(`groups.${group}`)}>
                <p className="px-3 pb-1.5 pt-3 text-micro text-muted-foreground/80">
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
                        "flex w-full items-center gap-3 rounded-ctl px-3 py-2.5 text-start text-sm transition-colors duration-(--motion-hover)",
                        isActive
                          ? "bg-foreground/8 text-foreground"
                          : "text-foreground/70",
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <ArrowIcon
                          direction="external"
                          motion="none"
                          className="text-muted-foreground/60"
                        />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <kbd className="shrink-0 text-micro text-muted-foreground/70">
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
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2.5">
          <span className="text-micro text-muted-foreground/70">
            {t("hint")}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground/70">
            <kbd className="rounded-ctl-xs border border-border-subtle bg-surface px-1 py-0.5 text-micro">↑</kbd>
            <kbd className="rounded-ctl-xs border border-border-subtle bg-surface px-1 py-0.5 text-micro">↓</kbd>
            <kbd className="rounded-ctl-xs border border-border-subtle bg-surface px-1 py-0.5 text-micro">↵</kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
