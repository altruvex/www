"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { Link, usePathname } from "@/i18n/navigation";
import { getAllCaseStudies } from "@/lib/data/case-studies";
import { normalizeLocale, SITE_CONFIG } from "@/lib/metadata";
import { getLenis } from "@/lib/motion/lenis-instance";
import { ScrollTrigger } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/www";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Mail,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { LanguageSwitcherBase } from "../base/language-switcher-base";
import { AltruvexLogo } from "../shared/altruvex-logo";

const NAV_ITEMS = [
  { key: "work", href: "/work" },
  { key: "services", href: "/services" },
  { key: "method", href: "/how-we-work" },
  { key: "pricing", href: "/pricing" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

// The pages that explain how a project runs. They have no overview page of
// their own, so "Method" opens on How we work and lists all five beneath it.
const METHOD_ITEMS = [
  { key: "process", href: "/process" },
  { key: "how-we-work", href: "/how-we-work" },
  { key: "approach", href: "/approach" },
  { key: "standards", href: "/standards" },
  { key: "faq", href: "/faq" },
] as const;

// The pages that sit under a top-level link. Labels come from the footer's
// service names so the two lists can never name a discipline differently.
const SERVICE_ITEMS = [
  { key: "webDesign", href: "/services/interface-design" },
  { key: "development", href: "/services/development" },
  { key: "consulting", href: "/services/consulting" },
  { key: "maintenance", href: "/services/maintenance" },
] as const;

type SubItem = { href: string; label: string };

type NavKey = (typeof NAV_ITEMS)[number]["key"];

// Items whose own page is an overview of their children get an "All …" link.
const HAS_OVERVIEW: ReadonlySet<NavKey> = new Set(["work", "services"]);

const CTA_HREF = "/transparency";

// Past this depth a scroll down tucks the bar away; any scroll up brings it back.
const HIDE_AFTER = 420;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemCurrent(
  pathname: string,
  item: (typeof NAV_ITEMS)[number],
): boolean {
  return item.key === "method"
    ? METHOD_ITEMS.some((method) => isCurrent(pathname, method.href))
    : isCurrent(pathname, item.href);
}

interface GroupToggleProps {
  open: boolean;
  controls: string;
  label: string;
  onToggle: () => void;
  className?: string;
}

// Opens a page's sub-pages in place; the page link beside it still navigates.
function GroupToggle({
  open,
  controls,
  label,
  onToggle,
  className,
}: GroupToggleProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-foreground/45 text-foreground/70 transition-colors duration-(--motion-instant) ease-smooth hover:bg-foreground/[0.05] hover:text-foreground aria-expanded:text-foreground",
        focusRing,
        className,
      )}
    >
      <ChevronDown
        aria-hidden
        className={cn(
          "size-4 transition-transform duration-(--motion-drawer) ease-smooth",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

function GroupReveal({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-(--motion-drawer) ease-smooth",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function Nav() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isTucked, setIsTucked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [isNavInverted, setIsNavInverted] = useState(false);
  const [isOverStage, setIsOverStage] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  // undefined = untouched, so the group of the page you are on starts open.
  const [openGroup, setOpenGroup] = useState<NavKey | null | undefined>(
    undefined,
  );
  const [rule, setRule] = useState<{ x: number; placed: boolean } | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const indexButtonRef = useRef<HTMLButtonElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isOpen = isMobileMenuOpen || isIndexOpen;
  const currentKey =
    NAV_ITEMS.find((item) => isItemCurrent(pathname, item))?.key ?? null;
  const ruleKey = hoveredKey ?? currentKey;
  const expandedKey = openGroup === undefined ? currentKey : openGroup;
  const toggleGroup = (key: NavKey) =>
    setOpenGroup(expandedKey === key ? null : key);

  const lang = normalizeLocale(locale);
  const subItems: Partial<Record<NavKey, SubItem[]>> = {
    work: getAllCaseStudies().map((study) => ({
      href: `/work/${study.slug}`,
      // A case-study name is "Project - its headline"; a menu needs the project.
      label: study.name[lang].split(/\s[-–—]\s/)[0] ?? study.name[lang],
    })),
    services: SERVICE_ITEMS.map((item) => ({
      href: item.href,
      label: tFooter(item.key),
    })),
    method: METHOD_ITEMS.map((item) => ({
      href: item.href,
      label: t(item.key),
    })),
  };

  useEffect(() => {
    let inverted: ScrollTrigger[] = [];
    let observer: MutationObserver | null = null;

    const sync = (self: ScrollTrigger) => {
      const y = self.scroll();
      setIsScrolled(y > 20);
      setIsTucked(y > HIDE_AFTER && self.direction === 1);
      const dark = document.documentElement.classList.contains("dark");
      setIsNavInverted(
        inverted.some(
          (trigger) =>
            trigger.isActive &&
            !(
              dark &&
              (trigger.trigger as HTMLElement | undefined)?.dataset
                .sceneLock === "dark"
            ),
        ),
      );
      setIsOverStage(
        inverted.some(
          (trigger) =>
            trigger.isActive &&
            (trigger.trigger as HTMLElement | undefined)?.hasAttribute(
              "data-nav-stage",
            ) === true,
        ),
      );
    };
    const page = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: sync,
      onRefresh: sync,
    });
    const settle = () => sync(page);
    ScrollTrigger.addEventListener("scrollEnd", settle);
    const attach = () => {
      const islands = [
        document.getElementById("services-wrapper"),
        ...Array.from(
          document.querySelectorAll<HTMLElement>("[data-nav-invert]"),
        ),
      ].filter((el): el is HTMLElement => el !== null);
      if (islands.length === 0) return false;
      const midline = () => (headerRef.current?.offsetHeight ?? 64) / 2;
      inverted = islands.map((island) =>
        ScrollTrigger.create({
          trigger: island,
          start: () => `top ${midline()}px`,
          end: () => `bottom ${midline()}px`,
          refreshPriority: -1,
          onToggle: settle,
        }),
      );
      settle();
      return true;
    };
    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      ScrollTrigger.removeEventListener("scrollEnd", settle);
      page.kill();
      inverted.forEach((trigger) => trigger.kill());
    };
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    getLenis()?.stop();
    return () => {
      getLenis()?.start();
    };
  }, [isOpen]);

  // One rule for all links: it rests under the current page and travels to
  // whichever link is hovered or focused. Measured against the list in
  // physical pixels, so the same translateX serves LTR and RTL.
  const placeRule = useCallback(() => {
    const link = ruleKey ? linkRefs.current[ruleKey] : null;
    const list = link?.closest("ul");
    if (!link || !list) {
      setRule(null);
      return;
    }
    const box = link.getBoundingClientRect();
    const x = box.left - list.getBoundingClientRect().left + box.width / 2;
    setRule((prev) => ({ x, placed: prev !== null }));
  }, [ruleKey]);

  useLayoutEffect(() => {
    placeRule();
  }, [placeRule, locale]);

  useEffect(() => {
    window.addEventListener("resize", placeRule);
    void document.fonts?.ready.then(placeRule);
    return () => window.removeEventListener("resize", placeRule);
  }, [placeRule]);

  const closeIndex = useCallback((returnFocus = false) => {
    setIsIndexOpen(false);
    if (returnFocus) indexButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isIndexOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeIndex(true);
    };
    // The panel only exists at desktop width; shrinking past it closes it so
    // the page is never left with scrolling stopped behind a hidden panel.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onWidth = () => {
      if (!desktop.matches) closeIndex();
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWidth);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWidth);
    };
  }, [isIndexOpen, closeIndex]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const tucked = isTucked && !isOpen;

  return (
    <>
      <div
        aria-hidden
        onClick={() => closeIndex()}
        className={cn(
          "fixed inset-0 z-30 hidden bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-(--motion-drawer) ease-smooth lg:block dark:bg-black/50",
          isIndexOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <header
        ref={headerRef}
        dir={dir}
        data-scene={isNavInverted && !isOpen ? "inverted" : undefined}
        data-over-stage={isOverStage && !isOpen ? "" : undefined}
        data-index-open={isIndexOpen ? "" : undefined}
        onFocusCapture={() => setIsTucked(false)}
        className={cn(
          "group/nav fixed top-0 w-full transition-[background-color,border-color,box-shadow,transform] duration-(--motion-drawer) ease-smooth",
          tucked && "-translate-y-full",
          isMobileMenuOpen ? "z-60" : "z-40",
        )}
      >
        {/* The material lives on its own layer, not on the header: a
            backdrop-filter on the header would make it the backdrop root, and
            the glass dropdowns hanging below it would blur nothing. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10",
            isMobileMenuOpen
              ? null
              : isIndexOpen
                ? "liquid-glass-panel rounded-none! border-x-0! border-t-0! shadow-none"
                : isScrolled && "liquid-glass-nav",
          )}
        />
        <Container>
          <div
            className={cn(
              "hidden w-full grid-cols-[1fr_auto_1fr] items-center gap-6 transition-[height] duration-(--motion-drawer) ease-smooth lg:grid",
              isScrolled || isIndexOpen ? "h-15" : "h-19",
            )}
          >
            <Link
              href="/"
              onClick={() => closeIndex()}
              className={cn(
                "group justify-self-start rounded-ctl-sm",
                focusRing,
              )}
            >
              <AltruvexLogo size="md" variant="full" />
            </Link>
            <nav aria-label={t("primaryLabel")}>
              <ul
                className="relative flex items-center gap-1"
                onPointerLeave={() => setHoveredKey(null)}
              >
                {NAV_ITEMS.map((item) => {
                  const active = item.key === currentKey;
                  const subs = subItems[item.key];
                  return (
                    <li key={item.key} className="group/item relative">
                      <Link
                        ref={(el) => {
                          linkRefs.current[item.key] = el;
                        }}
                        href={item.href}
                        onClick={() => closeIndex()}
                        onPointerEnter={() => setHoveredKey(item.key)}
                        onFocus={() => setHoveredKey(item.key)}
                        onBlur={() => setHoveredKey(null)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center rounded-ctl-sm px-3.5 text-sm font-medium text-nowrap transition-colors duration-(--motion-instant) ease-smooth",
                          focusRing,
                          active || item.key === ruleKey
                            ? "text-foreground"
                            : "text-foreground/70 hover:text-foreground",
                        )}
                      >
                        {t(item.key)}
                        {subs && (
                          <ChevronDown
                            aria-hidden
                            className="ms-1 size-3.5 opacity-60 transition-transform duration-(--motion-instant) ease-smooth group-focus-within/item:rotate-180 group-hover/item:rotate-180"
                          />
                        )}
                      </Link>
                      {subs && (
                        // Opens on hover and whenever focus is inside the item,
                        // so Tab walks from the link straight into its pages.
                        <div className="invisible absolute top-full left-1/2 z-10 -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-[opacity,transform,visibility] duration-(--motion-instant) ease-smooth group-focus-within/item:visible group-focus-within/item:translate-y-0 group-focus-within/item:opacity-100 group-hover/item:visible group-hover/item:translate-y-0 group-hover/item:opacity-100 group-data-[index-open]/nav:hidden">
                          <div className="liquid-glass-panel min-w-60 rounded-panel-sm p-1.5">
                            <ul>
                              {subs.map((sub) => (
                                <li key={sub.href}>
                                  <Link
                                    href={sub.href}
                                    aria-current={
                                      pathname === sub.href ? "page" : undefined
                                    }
                                    className={cn(
                                      "flex min-h-10 items-center rounded-ctl-sm px-3 text-sm text-nowrap text-foreground/75 transition-colors duration-(--motion-instant) ease-smooth hover:bg-foreground/[0.05] hover:text-foreground aria-[current=page]:text-foreground",
                                      focusRing,
                                    )}
                                  >
                                    {sub.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            {HAS_OVERVIEW.has(item.key) && (
                              <Link
                                href={item.href}
                                className={cn(
                                  "group/all mt-1.5 flex min-h-10 items-center justify-between gap-3 rounded-ctl-sm border-t border-border-subtle px-3 pt-1.5 text-sm font-medium text-nowrap text-foreground transition-colors duration-(--motion-instant) ease-smooth hover:text-brand-text",
                                  focusRing,
                                )}
                              >
                                {t(`all.${item.key}`)}
                                <ArrowRight
                                  aria-hidden
                                  className="size-4 transition-transform duration-(--motion-instant) ease-smooth group-hover/all:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/all:-translate-x-0.5"
                                />
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                <span
                  aria-hidden
                  style={
                    rule ? { transform: `translateX(${rule.x}px)` } : undefined
                  }
                  className={cn(
                    "pointer-events-none absolute bottom-0.5 left-0 -ml-2.25 h-0.5 w-4.5 rounded-full bg-brand group-data-[over-stage]/nav:bg-[hsl(var(--n-0))]",
                    rule?.placed &&
                      "transition-[transform,opacity] duration-(--motion-drawer) ease-smooth",
                    rule ? "opacity-100" : "opacity-0",
                  )}
                />
              </ul>
            </nav>
            <div className="flex items-center justify-self-end gap-1 text-nowrap">
              {/* Below xl the six links need the room; both settings stay in the index. */}
              <div className="hidden items-center gap-1 xl:flex">
                <LanguageSwitcherBase variant="inline" />
                <ThemeChanger />
              </div>
              <button
                ref={indexButtonRef}
                type="button"
                aria-expanded={isIndexOpen}
                aria-controls="site-index"
                onClick={() => setIsIndexOpen((open) => !open)}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-ctl-lg px-3 text-sm font-medium text-foreground/70 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-expanded:text-foreground",
                  focusRing,
                )}
              >
                {t("index")}
                <span
                  aria-hidden
                  className="relative flex size-3 items-center justify-center"
                >
                  <span className="absolute h-[1.5px] w-3 rounded-full bg-current" />
                  <span
                    className={cn(
                      "absolute h-3 w-[1.5px] rounded-full bg-current transition-transform duration-(--motion-drawer) ease-smooth",
                      isIndexOpen ? "scale-y-0" : "scale-y-100",
                    )}
                  />
                </span>
              </button>
              <span
                aria-hidden
                className="mx-2 h-4 w-px bg-border-mid transition-colors duration-(--motion-drawer)"
              />
              <MagneticButton asChild variant="primary" size="sm">
                <Link href={CTA_HREF} data-nav-cta onClick={() => closeIndex()}>
                  {t("getStarted")}
                </Link>
              </MagneticButton>
            </div>
          </div>
          <div
            id="site-index"
            inert={!isIndexOpen}
            data-lenis-prevent
            className={cn(
              "hidden transition-[grid-template-rows] duration-(--motion-drawer) ease-smooth lg:grid",
              isIndexOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  "grid max-h-[calc(100svh-4rem)] grid-cols-[1.3fr_1fr_1.2fr] overflow-y-auto overscroll-contain border-t border-border-subtle pt-10 pb-12 transition-opacity duration-(--motion-drawer) ease-smooth",
                  isIndexOpen ? "opacity-100" : "opacity-0",
                )}
              >
                <nav aria-label={t("pages")} className="pe-10">
                  <Eyebrow>{t("pages")}</Eyebrow>
                  <ol className="mt-5 border-t border-border-subtle">
                    {NAV_ITEMS.map((item, idx) => {
                      const active = item.key === currentKey;
                      const subs = subItems[item.key];
                      return (
                        <li
                          key={item.key}
                          className="border-b border-border-subtle"
                        >
                          <div className="flex items-center gap-3">
                            <Link
                              href={item.href}
                              onClick={() => closeIndex()}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "group grid flex-1 grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-2 rounded-ctl-sm py-3.5",
                                focusRing,
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  "text-sm tabular-nums",
                                  active
                                    ? "text-brand-text"
                                    : "text-foreground/55",
                                )}
                              >
                                <Num value={idx + 1} pad={2} />
                              </span>
                              <span
                                className={cn(
                                  "text-2xl font-semibold tracking-tight transition-colors duration-(--motion-instant) ease-smooth",
                                  active
                                    ? "text-foreground"
                                    : "text-foreground/75 group-hover:text-foreground",
                                )}
                              >
                                {t(item.key)}
                              </span>
                              <span className="text-sm text-foreground/60">
                                {t(`desc.${item.key}`)}
                              </span>
                            </Link>
                            {subs ? (
                              <GroupToggle
                                open={expandedKey === item.key}
                                controls={`index-group-${item.key}`}
                                label={t("subpages", { name: t(item.key) })}
                                onToggle={() => toggleGroup(item.key)}
                                className="size-9"
                              />
                            ) : (
                              <span aria-hidden className="size-9 shrink-0" />
                            )}
                          </div>
                          {subs && (
                            <GroupReveal
                              id={`index-group-${item.key}`}
                              open={expandedKey === item.key}
                            >
                              <ul className="flex flex-wrap gap-x-5 pb-3.5 ps-12">
                                {subs.map((sub) => (
                                  <li key={sub.href}>
                                    <Link
                                      href={sub.href}
                                      onClick={() => closeIndex()}
                                      aria-current={
                                        pathname === sub.href
                                          ? "page"
                                          : undefined
                                      }
                                      className={cn(
                                        "flex min-h-8 items-center rounded-ctl-xs text-sm text-foreground/65 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-[current=page]:text-foreground",
                                        focusRing,
                                      )}
                                    >
                                      {sub.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </GroupReveal>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </nav>
                <div className="border-s border-border-subtle px-10">
                  <Eyebrow>{t("directLines")}</Eyebrow>
                  <ul className="mt-5 grid gap-1">
                    <li>
                      <a
                        href={`mailto:${SITE_CONFIG.email}`}
                        className={cn(
                          "group flex min-h-10 items-center gap-2.5 rounded-ctl-sm text-base text-foreground/75 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground",
                          focusRing,
                        )}
                      >
                        <Mail
                          aria-hidden
                          className="size-4 shrink-0 text-foreground/55"
                        />
                        <bdi>{SITE_CONFIG.email}</bdi>
                      </a>
                    </li>
                    <li>
                      <Link
                        href="/schedule"
                        onClick={() => closeIndex()}
                        className={cn(
                          "group flex min-h-10 items-center gap-2.5 rounded-ctl-sm text-base text-foreground/75 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground",
                          focusRing,
                        )}
                      >
                        <Calendar
                          aria-hidden
                          className="size-4 shrink-0 text-foreground/55"
                        />
                        {t("schedule")}
                        <ArrowUpRight
                          aria-hidden
                          className="size-4 shrink-0 text-foreground/40 transition-transform duration-(--motion-instant) ease-smooth group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                        />
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col border-s border-border-subtle ps-10">
                  <Eyebrow>{t("settings")}</Eyebrow>
                  <div className="mt-5 grid gap-5">
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground/70">
                        {t("language")}
                      </span>
                      <LanguageSwitcherBase
                        variant="segmented"
                        className="w-full [&>button]:flex-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground/70">
                        {t("theme")}
                      </span>
                      <ThemeChanger
                        variant="segmented"
                        className="w-full [&>button]:flex-1"
                      />
                    </div>
                  </div>
                  <MagneticButton
                    asChild
                    variant="primary"
                    size="lg"
                    className="mt-8 h-12 w-full leading-none lg:min-h-12"
                  >
                    <Link href={CTA_HREF} onClick={() => closeIndex()}>
                      {t("getStarted")}
                    </Link>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-14 w-full items-center justify-between lg:hidden">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={cn("group relative z-50 rounded-ctl-sm", focusRing)}
            >
              <AltruvexLogo size="md" variant="full" />
            </Link>
            <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative z-50 -me-2.5 flex size-11 items-center justify-center rounded-full text-foreground",
                    focusRing,
                  )}
                  aria-label={isMobileMenuOpen ? t("closeMenu") : t("openMenu")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute h-[1.5px] w-5.5 rounded-full bg-current transition-transform duration-(--motion-drawer) ease-smooth",
                      isMobileMenuOpen ? "rotate-45" : "translate-y-[-3.5px]",
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute h-[1.5px] w-5.5 rounded-full bg-current transition-transform duration-(--motion-drawer) ease-smooth",
                      isMobileMenuOpen ? "-rotate-45" : "translate-y-[3.5px]",
                    )}
                  />
                </button>
              </DrawerTrigger>
              <DrawerContent
                dir={dir}
                data-lenis-prevent
                className="liquid-glass-panel rounded-b-none! border-b-0! outline-none data-[vaul-drawer-direction=bottom]:max-h-[88svh] lg:hidden"
              >
                <DrawerHeader className="sr-only">
                  <DrawerTitle>{t("menuTitle")}</DrawerTitle>
                  <DrawerDescription>{t("menuDescription")}</DrawerDescription>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] scrollbar-none sm:px-8 [&::-webkit-scrollbar]:hidden">
                  <nav aria-label={t("primaryLabel")}>
                    <Eyebrow>{t("pages")}</Eyebrow>
                    <ol className="mt-4 border-t border-border-subtle">
                      {NAV_ITEMS.map((item, idx) => {
                        const active = item.key === currentKey;
                        const subs = subItems[item.key];
                        return (
                          <li
                            key={item.key}
                            className="border-b border-border-subtle"
                          >
                            <div className="flex items-center gap-2">
                              <Link
                                href={item.href}
                                onClick={closeMobileMenu}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "group flex min-h-16 flex-1 items-center gap-4 rounded-ctl-sm py-3",
                                  focusRing,
                                )}
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    "w-7 shrink-0 text-sm tabular-nums",
                                    active
                                      ? "text-brand-text"
                                      : "text-foreground/55",
                                  )}
                                >
                                  <Num value={idx + 1} pad={2} />
                                </span>
                                <span className="flex flex-1 flex-col gap-0.5">
                                  <span
                                    className={cn(
                                      "text-2xl font-semibold tracking-tight transition-colors duration-(--motion-instant) ease-smooth",
                                      active
                                        ? "text-foreground"
                                        : "text-foreground/75 group-hover:text-foreground",
                                    )}
                                  >
                                    {t(item.key)}
                                  </span>
                                  <span className="text-sm text-foreground/60">
                                    {t(`desc.${item.key}`)}
                                  </span>
                                </span>
                                {!subs && (
                                  // Sized like the group toggle so every row ends on one line.
                                  <span
                                    aria-hidden
                                    className="flex size-11 shrink-0 items-center justify-center"
                                  >
                                    <ChevronRight
                                      aria-hidden
                                      className="size-5 shrink-0 text-foreground/35 transition-transform duration-(--motion-instant) ease-smooth group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                                    />
                                  </span>
                                )}
                              </Link>
                              {subs && (
                                <GroupToggle
                                  open={expandedKey === item.key}
                                  controls={`drawer-group-${item.key}`}
                                  label={t("subpages", { name: t(item.key) })}
                                  onToggle={() => toggleGroup(item.key)}
                                  className="size-11"
                                />
                              )}
                            </div>
                            {subs && (
                              <GroupReveal
                                id={`drawer-group-${item.key}`}
                                open={expandedKey === item.key}
                              >
                                <ul className="grid pb-3 ps-11">
                                  {subs.map((sub) => (
                                    <li key={sub.href}>
                                      <Link
                                        href={sub.href}
                                        onClick={closeMobileMenu}
                                        aria-current={
                                          pathname === sub.href
                                            ? "page"
                                            : undefined
                                        }
                                        className={cn(
                                          "flex min-h-11 items-center rounded-ctl-sm text-base text-foreground/65 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-[current=page]:text-foreground",
                                          focusRing,
                                        )}
                                      >
                                        {sub.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </GroupReveal>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                  <div className="mt-8 grid gap-3">
                    <MagneticButton
                      asChild
                      variant="primary"
                      size="lg"
                      className="h-12 w-full leading-none"
                    >
                      <Link href={CTA_HREF} onClick={closeMobileMenu}>
                        {t("getStarted")}
                      </Link>
                    </MagneticButton>
                    <MagneticButton
                      asChild
                      variant="secondary"
                      size="lg"
                      className="h-12 w-full gap-2 leading-none"
                    >
                      <Link href="/schedule" onClick={closeMobileMenu}>
                        <Calendar className="size-4" aria-hidden />
                        {t("schedule")}
                      </Link>
                    </MagneticButton>
                  </div>
                  <div className="mt-6 grid gap-5 border-t border-border-subtle pt-6">
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground/70">
                        {t("language")}
                      </span>
                      <LanguageSwitcherBase
                        variant="segmented"
                        className="w-full [&>button]:flex-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground/70">
                        {t("theme")}
                      </span>
                      <ThemeChanger
                        variant="segmented"
                        className="w-full [&>button]:flex-1"
                      />
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </Container>
      </header>
    </>
  );
}
