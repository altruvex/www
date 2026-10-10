"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import { Eyebrow } from "@repo/ui/www";
import { Link, usePathname } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { getClientCaseStudies } from "@/lib/data/case-studies";
import { normalizeLocale, SITE_CONFIG } from "@/lib/metadata";
import { getLenis } from "@/lib/motion/lenis-instance";
import { cn } from "@/lib/utils/utils";
import { AltruvexLogo, ArrowIcon } from "@repo/ui";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { LanguageSwitcherBase } from "../base/language-switcher-base";
import { localeMeta } from "@/i18n/locale-meta";

const NAV_ITEMS = [
  { key: "work", href: "/work" },
  { key: "services", href: "/services" },
  { key: "method", href: "/how-we-work" },
  { key: "pricing", href: "/pricing" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

const METHOD_ITEMS = [
  { key: "process", href: "/process" },
  { key: "how-we-work", href: "/how-we-work" },
  { key: "approach", href: "/approach" },
  { key: "standards", href: "/standards" },
  { key: "faq", href: "/faq" },
  // Our own site is not client work, so it sits under Method rather than Work.
  { key: "thisSite", href: "/work/altruvex-site" },
] as const;

const PRICING_ITEMS = [
  { key: "pricing", href: "/pricing" },
  { key: "transparency", href: "/transparency" },
] as const;

const SERVICE_ITEMS = [
  { key: "webDesign", href: "/services/interface-design" },
  { key: "development", href: "/services/development" },
  { key: "consulting", href: "/services/consulting" },
  { key: "maintenance", href: "/services/maintenance" },
] as const;

type SubItem = { href: string; label: string; hint?: string };

type NavKey = (typeof NAV_ITEMS)[number]["key"];

const HAS_OVERVIEW: ReadonlySet<NavKey> = new Set(["work", "services"]);

const CTA_HREF = getCommercialCta("projectRange").href;
const CALL_HREF = getCommercialCta("technicalCall").href;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemCurrent(
  pathname: string,
  item: (typeof NAV_ITEMS)[number],
): boolean {
  if (item.key === "method") {
    return METHOD_ITEMS.some((method) => isCurrent(pathname, method.href));
  }
  if (item.key === "work") {
    return (
      isCurrent(pathname, item.href) &&
      !METHOD_ITEMS.some((method) => isCurrent(pathname, method.href))
    );
  }
  if (item.key === "pricing") {
    return PRICING_ITEMS.some((page) => isCurrent(pathname, page.href));
  }
  return isCurrent(pathname, item.href);
}

type FlyoutKey = NavKey | "index";

// Hover intent, not animation: a pointer passing over the bar does not open a menu,
// and a pointer that slips off the panel for a moment does not close it.
const OPEN_INTENT_MS = 120;
const CLOSE_INTENT_MS = 200;

// Menu items arrive one after another, Apple-style. --i is the item's place in the
// cascade; leaving is one quick fade with no cascade, so a closing menu never lingers.
const desktopItem =
  "-translate-y-1.5 opacity-0 transition-[opacity,transform] duration-(--motion-instant) ease-strong group-data-[active]/panel:translate-y-0 group-data-[active]/panel:opacity-100 group-data-[active]/panel:duration-(--motion-drawer) group-data-[active]/panel:[transition-delay:calc(var(--i)*25ms+60ms)]";
const mobileItem =
  "-translate-y-1.5 opacity-0 transition-[opacity,transform] duration-(--motion-instant) ease-strong group-data-[active]/level:translate-y-0 group-data-[active]/level:opacity-100 group-data-[active]/level:duration-(--motion-drawer) group-data-[active]/level:[transition-delay:calc(var(--i)*30ms+80ms)]";

function cascade(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

const bigLink =
  "flex min-h-11 items-baseline rounded-ctl-sm py-1 text-2xl font-semibold tracking-tight text-foreground/80 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-[current=page]:text-foreground";
const smallLink =
  "group flex min-h-9 items-center gap-2.5 rounded-ctl-sm text-sm font-medium text-foreground/75 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground";
const mobileBigRow =
  "flex min-h-14 w-full items-center justify-between gap-4 rounded-ctl-sm text-start text-3xl font-semibold tracking-tight text-foreground/80 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-[current=page]:text-foreground data-[current]:text-foreground";

interface FlyoutPanelProps {
  id: string;
  label: string;
  active: boolean;
  panelRef: Ref<HTMLDivElement>;
  children: ReactNode;
}

function FlyoutPanel({ id, label, active, panelRef, children }: FlyoutPanelProps) {
  return (
    <div
      id={id}
      ref={panelRef}
      role="region"
      aria-label={label}
      inert={!active}
      data-active={active ? "" : undefined}
      className={cn(
        "group/panel col-start-1 row-start-1 self-start transition-[visibility] duration-(--motion-drawer)",
        active ? "pointer-events-auto visible" : "invisible",
      )}
    >
      <div className="grid max-h-[calc(100svh-5rem)] grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] -mx-2 gap-x-12 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pt-8 pb-14">
        {children}
      </div>
    </div>
  );
}

interface MobileLevelProps {
  active: boolean;
  // Where an inactive level waits: the root slides out to the start side, a sub-level
  // waits on the end side, and when the whole menu is closed nothing slides.
  rest: "start" | "end" | "none";
  levelRef?: Ref<HTMLDivElement>;
  label: string;
  children: ReactNode;
}

function MobileLevel({ active, rest, levelRef, label, children }: MobileLevelProps) {
  return (
    <div
      ref={levelRef}
      role="group"
      aria-label={label}
      inert={!active}
      data-active={active ? "" : undefined}
      className={cn(
        "group/level absolute inset-0 overflow-y-auto overscroll-contain px-6 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] transition-[opacity,transform,visibility] duration-(--motion-drawer) ease-strong sm:px-10",
        active
          ? "visible translate-x-0 opacity-100"
          : cn(
              "invisible opacity-0",
              rest === "start" && "-translate-x-8 rtl:translate-x-8",
              rest === "end" && "translate-x-8 rtl:-translate-x-8",
            ),
      )}
    >
      {children}
    </div>
  );
}

export function Nav() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [flyout, setFlyout] = useState<FlyoutKey | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<NavKey | null>(null);
  // The menus stay out of the DOM until the visitor shows intent (pointer or focus on
  // the header), so every page doesn't ship ~150 hidden nodes. Once mounted they stay
  // mounted, so every open runs its transition on content that already exists.
  const [mounted, setMounted] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [isNavInverted, setIsNavInverted] = useState(false);
  const [isOverStage, setIsOverStage] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [rule, setRule] = useState<{ x: number; placed: boolean } | null>(null);
  const [lastPath, setLastPath] = useState(pathname);
  const headerRef = useRef<HTMLElement>(null);
  const indexButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const triggerRefs = useRef<Partial<Record<FlyoutKey, HTMLButtonElement | null>>>({});
  const panelRefs = useRef<Partial<Record<FlyoutKey, HTMLDivElement | null>>>({});
  const levelRefs = useRef<Partial<Record<NavKey, HTMLDivElement | null>>>({});
  const groupButtonRefs = useRef<Partial<Record<NavKey, HTMLButtonElement | null>>>({});
  const flyoutRef = useRef<FlyoutKey | null>(null);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setFlyout(null);
    setIsMobileMenuOpen(false);
    setMobileGroup(null);
  }
  if ((flyout !== null || isMobileMenuOpen) && !mounted) setMounted(true);

  const dir = localeMeta(locale).dir;
  const isOpen = flyout !== null || isMobileMenuOpen;
  const currentKey =
    NAV_ITEMS.find((item) => isItemCurrent(pathname, item))?.key ?? null;
  const ruleKey =
    hoveredKey ?? (flyout && flyout !== "index" ? flyout : null) ?? currentKey;

  const lang = normalizeLocale(locale);
  const subItems: Partial<Record<NavKey, SubItem[]>> = {
    work: getClientCaseStudies().map((study) => ({
      href: `/work/${study.slug}`,
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
    pricing: PRICING_ITEMS.map((item) => ({
      href: item.href,
      label: t(item.key),
      hint: item.key === "transparency" ? t("transparencyHint") : undefined,
    })),
  };
  const groups = NAV_ITEMS.filter((item) => subItems[item.key]);

  useEffect(() => {
    flyoutRef.current = flyout;
  }, [flyout]);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const header = headerRef.current;
      if (!header) return;
      setIsScrolled(window.scrollY > 20);
      const under = document
        .elementsFromPoint(window.innerWidth / 2, header.offsetHeight / 2)
        .find((el) => !header.contains(el) && !el.closest("[data-nav-skip]"));
      const scene =
        under?.closest<HTMLElement>('[data-scene="inverted"]') ?? null;
      const dark = document.documentElement.classList.contains("dark");
      setIsNavInverted(
        scene !== null && !(dark && scene.dataset.sceneLock === "dark"),
      );
      setIsOverStage(scene?.hasAttribute("data-nav-stage") === true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scene"],
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    getLenis()?.stop();
    return () => {
      getLenis()?.start();
    };
  }, [isOpen]);

  // Touch scrolling doesn't go through Lenis, so the full-screen menu also locks the root.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [isMobileMenuOpen]);

  // The shared glass grows to exactly the open panel's height.
  const measurePanel = useCallback(() => {
    const panel = flyout ? panelRefs.current[flyout] : null;
    setPanelHeight(panel ? panel.offsetHeight : 0);
  }, [flyout]);

  useLayoutEffect(() => {
    measurePanel();
    const panel = flyout ? panelRefs.current[flyout] : null;
    if (!panel) return;
    const observer = new ResizeObserver(measurePanel);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [measurePanel, flyout, mounted]);

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

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };

  useEffect(() => clearTimers, []);

  const closeFlyout = useCallback((returnFocus = false) => {
    const open = flyoutRef.current;
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setFlyout(null);
    if (returnFocus && open) {
      (open === "index"
        ? indexButtonRef.current
        : triggerRefs.current[open]
      )?.focus();
    }
  }, []);

  // A menu already open switches at once; a closed one waits for the pointer to settle.
  const intendOpen = (key: FlyoutKey) => {
    clearTimers();
    if (flyoutRef.current) {
      setFlyout(key);
      return;
    }
    openTimer.current = window.setTimeout(() => setFlyout(key), OPEN_INTENT_MS);
  };

  const intendClose = () => {
    clearTimers();
    if (!flyoutRef.current) return;
    closeTimer.current = window.setTimeout(
      () => setFlyout(null),
      CLOSE_INTENT_MS,
    );
  };

  const focusFirstIn = (element: HTMLElement | null | undefined) => {
    requestAnimationFrame(() => {
      element?.querySelector<HTMLElement>("a[href], button")?.focus();
    });
  };

  const closeMobileMenu = useCallback((returnFocus = false) => {
    setIsMobileMenuOpen(false);
    setMobileGroup(null);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

  const openMobileGroup = (key: NavKey) => {
    setMobileGroup(key);
    focusFirstIn(levelRefs.current[key]);
  };

  const closeMobileGroup = () => {
    const key = mobileGroup;
    setMobileGroup(null);
    if (key) requestAnimationFrame(() => groupButtonRefs.current[key]?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (flyoutRef.current) closeFlyout(true);
      else closeMobileMenu(true);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onWidth = () => {
      if (desktop.matches) closeMobileMenu();
      else closeFlyout();
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWidth);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWidth);
    };
  }, [isOpen, closeFlyout, closeMobileMenu]);

  const directLines = (offset: number) => (
    <div>
      <Eyebrow className={desktopItem} style={cascade(offset)}>
        {t("directLines")}
      </Eyebrow>
      <ul className="mt-4 grid gap-0.5">
        <li className={desktopItem} style={cascade(offset + 1)}>
          <a
            href={`mailto:${SITE_CONFIG.email}`}
            className={cn(smallLink, focusRing)}
          >
            <Mail aria-hidden className="size-4 shrink-0 text-foreground/55" />
            <bdi>{SITE_CONFIG.email}</bdi>
          </a>
        </li>
        <li className={desktopItem} style={cascade(offset + 2)}>
          <Link
            href={CALL_HREF}
            onClick={() => closeFlyout()}
            className={cn(smallLink, focusRing)}
          >
            <Calendar
              aria-hidden
              className="size-4 shrink-0 text-foreground/55"
            />
            {t("schedule")}
          </Link>
        </li>
      </ul>
    </div>
  );

  const settings = (offset: number, cascadeClass: string) => (
    <div className="grid gap-5">
      <div className={cn("grid gap-2", cascadeClass)} style={cascade(offset)}>
        <span className="text-sm font-medium text-foreground/70">
          {t("language")}
        </span>
        <LanguageSwitcherBase
          variant="segmented"
          className="w-full [&>button]:flex-1"
        />
      </div>
      <div
        className={cn("grid gap-2", cascadeClass)}
        style={cascade(offset + 1)}
      >
        <span className="text-sm font-medium text-foreground/70">
          {t("theme")}
        </span>
        <ThemeChanger variant="segmented" className="w-full [&>button]:flex-1" />
      </div>
    </div>
  );

  return (
    <>
      <div
        aria-hidden
        onClick={() => closeFlyout()}
        onPointerEnter={intendClose}
        className={cn(
          "fixed inset-0 z-30 hidden bg-foreground/15 backdrop-blur-sm transition-opacity duration-(--motion-drawer) ease-smooth lg:block dark:bg-black/45",
          flyout ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <header
        ref={headerRef}
        dir={dir}
        data-scene={isNavInverted && !isOpen ? "inverted" : undefined}
        data-over-stage={isOverStage && !isOpen ? "" : undefined}
        data-menu-open={isOpen ? "" : undefined}
        onPointerEnter={() => {
          window.clearTimeout(closeTimer.current);
          setMounted(true);
        }}
        onPointerLeave={intendClose}
        onFocus={() => setMounted(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (!(next instanceof Node && event.currentTarget.contains(next))) {
            closeFlyout();
          }
        }}
        style={{ "--flyout-h": `${panelHeight}px` } as CSSProperties}
        className={cn(
          "group/nav fixed top-0 w-full text-foreground transition-[color,background-color,border-color,box-shadow] duration-(--motion-drawer) ease-smooth",
          isMobileMenuOpen ? "z-60" : "z-40",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10",
            isScrolled && "liquid-glass-nav",
          )}
        />
        {/* One glass sheet for every menu. It never changes class — it fades in and
            grows to the open panel's height — so opening a menu is one continuous
            motion instead of a material swap. */}
        <div
          aria-hidden
          className={cn(
            "liquid-glass-clear liquid-glass-clear-dense pointer-events-none absolute inset-x-0 top-0 -z-10 rounded-none! border-x-0! border-t-0! shadow-none! [transition:height_var(--motion-drawer)_var(--ease-strong),opacity_var(--motion-drawer)_var(--ease-smooth)]!",
            isMobileMenuOpen ? "h-svh" : "h-[calc(100%+var(--flyout-h))]",
            isOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <Container>
          <div
            className={cn(
              "hidden w-full grid-cols-[1fr_auto_1fr] items-center gap-6 transition-[height] duration-(--motion-drawer) ease-smooth lg:grid",
              isScrolled ? "h-15" : "h-19",
            )}
          >
            <Link
              href="/"
              onClick={() => closeFlyout()}
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
                  const expanded = flyout === item.key;
                  return (
                    <li
                      key={item.key}
                      className="flex items-center"
                      onPointerEnter={() =>
                        subs ? intendOpen(item.key) : intendClose()
                      }
                    >
                      <Link
                        ref={(el) => {
                          linkRefs.current[item.key] = el;
                        }}
                        href={item.href}
                        onClick={() => closeFlyout()}
                        onPointerEnter={() => setHoveredKey(item.key)}
                        onFocus={() => setHoveredKey(item.key)}
                        onBlur={() => setHoveredKey(null)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center rounded-ctl-sm text-sm font-medium text-nowrap transition-colors duration-(--motion-instant) ease-smooth",
                          subs ? "ps-3.5 pe-1" : "px-3.5",
                          focusRing,
                          active || item.key === ruleKey
                            ? "text-foreground"
                            : "text-foreground/70 hover:text-foreground",
                        )}
                      >
                        {t(item.key)}
                      </Link>
                      {subs && (
                        <button
                          ref={(el) => {
                            triggerRefs.current[item.key] = el;
                          }}
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`flyout-${item.key}`}
                          aria-label={t("subpages", { name: t(item.key) })}
                          onClick={(event) => {
                            // A pointer has already opened it by hovering; a key press toggles
                            // and carries focus into the menu.
                            if (event.detail > 0) {
                              clearTimers();
                              setFlyout(item.key);
                              return;
                            }
                            if (expanded) {
                              closeFlyout();
                              return;
                            }
                            clearTimers();
                            setFlyout(item.key);
                            focusFirstIn(panelRefs.current[item.key]);
                          }}
                          className={cn(
                            "me-1 flex size-6 items-center justify-center rounded-ctl-xs text-foreground/60 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground aria-expanded:text-foreground",
                            focusRing,
                          )}
                        >
                          <ChevronDown
                            aria-hidden
                            className={cn(
                              "size-3.5 transition-transform duration-(--motion-drawer) ease-strong",
                              expanded && "rotate-180",
                            )}
                          />
                        </button>
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
                    // brand-allow: rtl-physical-property — rule.x is measured from the list's physical left edge, in both directions.
                    "pointer-events-none absolute bottom-0.5 left-0 -ml-2.25 h-0.5 w-4.5 rounded-full bg-brand group-data-[over-stage]/nav:bg-[hsl(var(--n-0))]",
                    rule?.placed &&
                      "transition-[transform,opacity] duration-(--motion-drawer) ease-smooth",
                    rule ? "opacity-100" : "opacity-0",
                  )}
                />
              </ul>
            </nav>
            <div className="flex items-center justify-self-end gap-1 text-nowrap">
              <div className="hidden items-center gap-1 xl:flex">
                <LanguageSwitcherBase variant="inline" />
                <ThemeChanger />
              </div>
              <button
                ref={indexButtonRef}
                type="button"
                aria-expanded={flyout === "index"}
                aria-controls="flyout-index"
                onClick={(event) => {
                  clearTimers();
                  if (flyout === "index") {
                    closeFlyout();
                    return;
                  }
                  setFlyout("index");
                  if (event.detail === 0) focusFirstIn(panelRefs.current.index);
                }}
                onPointerEnter={() => {
                  if (flyoutRef.current) intendOpen("index");
                }}
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
                      "absolute h-3 w-[1.5px] rounded-full bg-current transition-transform duration-(--motion-drawer) ease-strong",
                      flyout === "index" ? "scale-y-0" : "scale-y-100",
                    )}
                  />
                </span>
              </button>
              <span
                aria-hidden
                className="mx-2 h-4 w-px bg-border-mid transition-colors duration-(--motion-drawer)"
              />
              <MagneticButton asChild variant="primary" size="sm">
                <Link href={CTA_HREF} data-nav-cta onClick={() => closeFlyout()}>
                  {t("getStarted")}
                </Link>
              </MagneticButton>
            </div>
          </div>
          <div className="flex h-14 w-full items-center justify-between lg:hidden">
            {/* Apple-style: the open menu takes over the logo's place. The logo steps
                aside, and inside a group the way back sits where the logo was. */}
            <div className="relative z-50 flex items-center">
              <Link
                href="/"
                onClick={() => closeMobileMenu()}
                inert={isMobileMenuOpen}
                className={cn(
                  "group rounded-ctl-sm transition-opacity duration-(--motion-instant) ease-smooth",
                  isMobileMenuOpen && "opacity-0",
                  focusRing,
                )}
              >
                <AltruvexLogo size="md" variant="full" />
              </Link>
              <button
                type="button"
                onClick={closeMobileGroup}
                inert={!mobileGroup}
                aria-hidden={!mobileGroup}
                className={cn(
                  "absolute start-0 -ms-2.5 flex min-h-11 items-center gap-1 rounded-ctl-sm pe-2 text-sm font-medium text-foreground/70 transition-[opacity,transform] duration-(--motion-drawer) ease-strong hover:text-foreground",
                  mobileGroup
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none translate-x-2 opacity-0 rtl:-translate-x-2",
                  focusRing,
                )}
              >
                <ChevronLeft aria-hidden className="size-5 rtl:-scale-x-100" />
                {t("back")}
              </button>
            </div>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? t("closeMenu") : t("openMenu")}
              onPointerDown={() => setMounted(true)}
              onClick={() => {
                if (isMobileMenuOpen) {
                  closeMobileMenu();
                  return;
                }
                setMobileGroup(null);
                setIsMobileMenuOpen(true);
              }}
              className={cn(
                "relative z-50 -me-2.5 flex size-11 items-center justify-center rounded-full text-foreground",
                focusRing,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute h-[1.5px] w-5.5 rounded-full bg-current transition-transform duration-(--motion-drawer) ease-strong",
                  isMobileMenuOpen ? "rotate-45" : "translate-y-[-3.5px]",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute h-[1.5px] w-5.5 rounded-full bg-current transition-transform duration-(--motion-drawer) ease-strong",
                  isMobileMenuOpen ? "-rotate-45" : "translate-y-[3.5px]",
                )}
              />
            </button>
          </div>
        </Container>

        {/* Desktop menus: every panel shares one grid cell under the bar, so moving
            between items cross-fades content while the glass resizes around it. */}
        <div
          data-lenis-prevent
          className="pointer-events-none absolute inset-x-0 top-full hidden lg:block"
        >
          {mounted && (
            <Container className="grid">
              {groups.map((item) => {
                const subs = subItems[item.key] ?? [];
                const active = flyout === item.key;
                return (
                  <FlyoutPanel
                    key={item.key}
                    id={`flyout-${item.key}`}
                    label={t(item.key)}
                    active={active}
                    panelRef={(el) => {
                      panelRefs.current[item.key] = el;
                    }}
                  >
                    <div>
                      <Eyebrow className={desktopItem} style={cascade(0)}>
                        {t("subpages", { name: t(item.key) })}
                      </Eyebrow>
                      <ul className="mt-4 grid">
                        {subs.map((sub, i) => (
                          <li
                            key={sub.href}
                            className={desktopItem}
                            style={cascade(i + 1)}
                          >
                            <Link
                              href={sub.href}
                              onClick={() => closeFlyout()}
                              aria-current={
                                pathname === sub.href ? "page" : undefined
                              }
                              className={cn(bigLink, focusRing)}
                            >
                              {sub.label}
                              {sub.hint && (
                                <span className="ms-3 text-sm font-normal tracking-normal text-foreground/60">
                                  {sub.hint}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Eyebrow className={desktopItem} style={cascade(1)}>
                        {t(item.key)}
                      </Eyebrow>
                      <p
                        className={cn(
                          "mt-4 max-w-[30ch] text-sm leading-relaxed text-foreground/65",
                          desktopItem,
                        )}
                        style={cascade(2)}
                      >
                        {t(`desc.${item.key}`)}
                      </p>
                      {HAS_OVERVIEW.has(item.key) && (
                        <div className={cn("mt-3", desktopItem)} style={cascade(3)}>
                          <Link
                            href={item.href}
                            onClick={() => closeFlyout()}
                            className={cn(
                              "group/all inline-flex min-h-9 items-center gap-2 rounded-ctl-sm text-sm font-medium text-brand-text",
                              focusRing,
                            )}
                          >
                            {t(`all.${item.key}`)}
                            <ArrowIcon
                              motion="none"
                              className="duration-(--motion-instant) ease-smooth group-hover/all:translate-x-0.5 rtl:group-hover/all:-translate-x-0.5"
                            />
                          </Link>
                        </div>
                      )}
                    </div>
                    {directLines(2)}
                  </FlyoutPanel>
                );
              })}
              <FlyoutPanel
                id="flyout-index"
                label={t("index")}
                active={flyout === "index"}
                panelRef={(el) => {
                  panelRefs.current.index = el;
                }}
              >
                <nav aria-label={t("pages")}>
                  <Eyebrow className={desktopItem} style={cascade(0)}>
                    {t("pages")}
                  </Eyebrow>
                  <ul className="mt-4 grid">
                    {NAV_ITEMS.map((item, i) => (
                      <li
                        key={item.key}
                        className={desktopItem}
                        style={cascade(i + 1)}
                      >
                        <Link
                          href={item.href}
                          onClick={() => closeFlyout()}
                          aria-current={
                            item.key === currentKey ? "page" : undefined
                          }
                          className={cn(bigLink, focusRing)}
                        >
                          {t(item.key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                {directLines(1)}
                <div>
                  <Eyebrow className={desktopItem} style={cascade(2)}>
                    {t("settings")}
                  </Eyebrow>
                  <div className="mt-4">{settings(3, desktopItem)}</div>
                  <div className={cn("mt-8", desktopItem)} style={cascade(5)}>
                    <MagneticButton
                      asChild
                      variant="primary"
                      size="lg"
                      className="h-12 w-full leading-none lg:min-h-12"
                    >
                      <Link href={CTA_HREF} onClick={() => closeFlyout()}>
                        {t("getStarted")}
                      </Link>
                    </MagneticButton>
                  </div>
                </div>
              </FlyoutPanel>
            </Container>
          )}
        </div>

        {/* Mobile menu: the same glass sheet fills the screen; groups open as a second
            level that slides in from the end side, with a way back. */}
        <div
          id="mobile-menu"
          inert={!isMobileMenuOpen}
          data-lenis-prevent
          className={cn(
            "fixed inset-x-0 top-14 bottom-0 overflow-hidden transition-[visibility] duration-(--motion-drawer) lg:hidden",
            isMobileMenuOpen ? "visible" : "pointer-events-none invisible",
          )}
        >
          {mounted && (
            <>
              <MobileLevel
                active={isMobileMenuOpen && mobileGroup === null}
                rest={isMobileMenuOpen ? "start" : "none"}
                label={t("menuTitle")}
              >
                <nav aria-label={t("primaryLabel")}>
                  <ul className="grid">
                    {NAV_ITEMS.map((item, i) => {
                      const active = item.key === currentKey;
                      const subs = subItems[item.key];
                      return (
                        <li
                          key={item.key}
                          className={mobileItem}
                          style={cascade(i)}
                        >
                          {subs ? (
                            <button
                              ref={(el) => {
                                groupButtonRefs.current[item.key] = el;
                              }}
                              type="button"
                              aria-expanded={mobileGroup === item.key}
                              aria-controls={`mobile-level-${item.key}`}
                              data-current={active ? "" : undefined}
                              onClick={() => openMobileGroup(item.key)}
                              className={cn(mobileBigRow, focusRing)}
                            >
                              {t(item.key)}
                              <ChevronRight
                                aria-hidden
                                className="size-5 shrink-0 text-foreground/40 rtl:-scale-x-100"
                              />
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => closeMobileMenu()}
                              aria-current={active ? "page" : undefined}
                              className={cn(mobileBigRow, focusRing)}
                            >
                              {t(item.key)}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div
                  className={cn("mt-8 grid gap-3", mobileItem)}
                  style={cascade(NAV_ITEMS.length)}
                >
                  <MagneticButton
                    asChild
                    variant="primary"
                    size="lg"
                    className="h-12 w-full leading-none"
                  >
                    <Link href={CTA_HREF} onClick={() => closeMobileMenu()}>
                      {t("getStarted")}
                    </Link>
                  </MagneticButton>
                  <MagneticButton
                    asChild
                    variant="secondary"
                    size="lg"
                    className="h-12 w-full gap-2 leading-none"
                  >
                    <Link href={CALL_HREF} onClick={() => closeMobileMenu()}>
                      <Calendar className="size-4" aria-hidden />
                      {t("schedule")}
                    </Link>
                  </MagneticButton>
                </div>
                <div className="mt-8 border-t border-border-subtle pt-6">
                  {settings(NAV_ITEMS.length + 1, mobileItem)}
                </div>
              </MobileLevel>
              {groups.map((item) => {
                const subs = subItems[item.key] ?? [];
                return (
                  <MobileLevel
                    key={item.key}
                    active={isMobileMenuOpen && mobileGroup === item.key}
                    rest={isMobileMenuOpen ? "end" : "none"}
                    label={t("subpages", { name: t(item.key) })}
                    levelRef={(el) => {
                      levelRefs.current[item.key] = el;
                    }}
                  >
                    <div id={`mobile-level-${item.key}`}>
                      <Eyebrow
                        className={cn("mt-2", mobileItem)}
                        style={cascade(0)}
                      >
                        {t("subpages", { name: t(item.key) })}
                      </Eyebrow>
                      <ul className="mt-3 grid">
                        {subs.map((sub, i) => (
                          <li
                            key={sub.href}
                            className={mobileItem}
                            style={cascade(i + 2)}
                          >
                            <Link
                              href={sub.href}
                              onClick={() => closeMobileMenu()}
                              aria-current={
                                pathname === sub.href ? "page" : undefined
                              }
                              className={cn(
                                mobileBigRow,
                                "text-2xl",
                                focusRing,
                              )}
                            >
                              <span>
                                {sub.label}
                                {sub.hint && (
                                  <span className="block text-sm font-normal tracking-normal text-foreground/60">
                                    {sub.hint}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {HAS_OVERVIEW.has(item.key) && (
                        <div
                          className={cn("mt-6", mobileItem)}
                          style={cascade(subs.length + 2)}
                        >
                          <Link
                            href={item.href}
                            onClick={() => closeMobileMenu()}
                            className={cn(
                              "inline-flex min-h-11 items-center gap-2 rounded-ctl-sm text-base font-medium text-brand-text",
                              focusRing,
                            )}
                          >
                            {t(`all.${item.key}`)}
                            <ArrowIcon motion="none" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </MobileLevel>
                );
              })}
            </>
          )}
        </div>
      </header>
    </>
  );
}
