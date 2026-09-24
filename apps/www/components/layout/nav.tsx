"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import { Num } from "@/components/ui/num";
import { Link, usePathname } from "@/i18n/navigation";
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
import { Calendar, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcherBase } from "../base/language-switcher-base";
import { AltruvexLogo } from "../shared/altruvex-logo";

const NAV_ITEMS = [
  { key: "work", href: "/work" },
  { key: "services", href: "/services" },
  { key: "pricing", href: "/pricing" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

const CTA_HREF = "/transparency";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavInverted, setIsNavInverted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    let inverted: ScrollTrigger[] = [];
    let observer: MutationObserver | null = null;

    const sync = (self: ScrollTrigger) => {
      setIsScrolled(self.scroll() > 20);
      /* An island locked dark needs no inverted bar in the dark theme — the
         bar is already dark there, and inverting it would turn it light. */
      const dark = document.documentElement.classList.contains("dark");
      setIsNavInverted(
        inverted.some(
          (trigger) =>
            trigger.isActive &&
            !(dark && (trigger.trigger as HTMLElement | undefined)?.dataset.sceneLock === "dark"),
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

    /* The bar inverts over any dark island that asks for it: the homepage's
       services wrapper, and every element marked `data-nav-invert` (the
       /services/development studio sections). One trigger per island, and
       the bar is inverted while any of them sits under its midline. */
    const attach = () => {
      const islands = [
        document.getElementById("services-wrapper"),
        ...Array.from(document.querySelectorAll<HTMLElement>("[data-nav-invert]")),
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
    if (!isMobileMenuOpen) return;
    getLenis()?.stop();
    return () => {
      getLenis()?.start();
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header
      ref={headerRef}
      dir={dir}
      data-scene={isNavInverted && !isMobileMenuOpen ? "inverted" : undefined}
      className={cn(
        "fixed top-0 w-full transition-[background-color,border-color,box-shadow] duration-(--motion-drawer) ease-smooth",
        isMobileMenuOpen
          ? "z-60 border-b border-transparent bg-transparent"
          : cn(
              "z-40",
              isScrolled
                ? "liquid-glass-nav"
                : "border-b border-transparent bg-transparent",
            ),
      )}
    >
      <Container>
        <div className="hidden h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-6 lg:grid">
          <Link
            href="/"
            className={cn("group justify-self-start rounded-ctl-sm", focusRing)}
          >
            <AltruvexLogo size="md" variant="full" />
          </Link>
          <nav aria-label={t("primaryLabel")}>
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isCurrent(pathname, item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-10 items-center rounded-ctl-sm px-3.5 text-sm font-medium text-nowrap transition-colors duration-(--motion-instant) ease-smooth",
                        "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-1 after:mx-auto after:h-0.5 after:w-4 after:rounded-full after:transition-[transform,background-color] after:duration-(--motion-instant) after:ease-smooth",
                        focusRing,
                        active
                          ? "text-foreground after:scale-x-100 after:bg-brand"
                          : "text-foreground/70 after:scale-x-0 after:bg-foreground/30 hover:text-foreground hover:after:scale-x-100",
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center justify-self-end gap-1 text-nowrap">
            <LanguageSwitcherBase variant="inline" />
            <ThemeChanger />
            <span
              aria-hidden
              className="mx-2 h-4 w-px bg-border-mid transition-colors duration-(--motion-drawer)"
            />
            <MagneticButton asChild variant="primary" size="sm">
              <Link href={CTA_HREF}>{t("getStarted")}</Link>
            </MagneticButton>
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
              className="border-border-subtle bg-background outline-none data-[vaul-drawer-direction=bottom]:max-h-[88svh] lg:hidden"
            >
              <DrawerHeader className="sr-only">
                <DrawerTitle>{t("menuTitle")}</DrawerTitle>
                <DrawerDescription>{t("menuDescription")}</DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] scrollbar-none sm:px-8 [&::-webkit-scrollbar]:hidden">
                <nav aria-label={t("primaryLabel")}>
                  <ol className="border-t border-border-subtle">
                    {NAV_ITEMS.map((item, idx) => {
                      const active = isCurrent(pathname, item.href);
                      return (
                        <li key={item.key} className="border-b border-border-subtle">
                          <Link
                            href={item.href}
                            onClick={closeMobileMenu}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group flex min-h-16 items-center gap-4 rounded-ctl-sm py-3",
                              focusRing,
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "w-7 shrink-0 text-sm tabular-nums ltr:font-mono",
                                active
                                  ? "text-brand-text"
                                  : "text-foreground/55",
                              )}
                            >
                              <Num value={idx + 1} pad={2} />
                            </span>
                            <span
                              className={cn(
                                "flex-1 font-sans text-2xl font-semibold tracking-tight transition-colors duration-(--motion-instant) ease-smooth",
                                active
                                  ? "text-foreground"
                                  : "text-foreground/75 group-hover:text-foreground",
                              )}
                            >
                              {t(item.key)}
                            </span>
                            <ChevronRight
                              aria-hidden
                              className="size-5 shrink-0 text-foreground/35 transition-transform duration-(--motion-instant) ease-smooth group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                            />
                          </Link>
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
  );
}
