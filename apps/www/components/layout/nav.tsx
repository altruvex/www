"use client";

import { NavDrawer, type NavDrawerItem } from "@/components/layout/nav-drawer";
import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { LanguageSwitcherBase } from "../base/language-switcher-base";
import { AltruvexLogo } from "../shared/altruvex-logo";

const NAV_ITEMS: readonly NavDrawerItem[] = [
  { key: "work", href: "/work" },
  { key: "services", href: "/services" },
  { key: "pricing", href: "/pricing" },
  { key: "contact", href: "/contact" },
  { key: "transparency", href: "/transparency" },
];

export function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  // The drawer stores the route it was opened on rather than a bare boolean, so
  // any navigation (in-drawer link, browser back) closes it by derivation —
  // no effect that re-renders the header on every route change.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const [isNavInverted, setIsNavInverted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isMobileMenuOpen = menuOpenedAt !== null && menuOpenedAt === pathname;

  useEffect(() => {
    // Scene state must track the wrapper's *live* geometry. Scroll events
    // alone go stale: lazy sections mounting (and scroll restoration) shift
    // the wrapper's position without firing any scroll event, which left the
    // header stuck on data-scene="inverted" over the light hero (audit SYS-1).
    const check = () => {
      setIsScrolled(window.scrollY > 20);
      const servicesWrapper = document.getElementById("services-wrapper");
      if (servicesWrapper && window.scrollY > 100) {
        const rect = servicesWrapper.getBoundingClientRect();
        const overlaps = rect.top <= 64 && rect.bottom >= 0;
        setIsNavInverted(overlaps && !isMobileMenuOpen);
      } else {
        setIsNavInverted(false);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    // Catches layout shifts (lazy section mounts) that move the wrapper
    // while the scroll position stays put.
    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    check();
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      ro.disconnect();
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMenuOpenedAt(null), []);
  const toggleMobileMenu = () =>
    setMenuOpenedAt((openedAt) => (openedAt === pathname ? null : pathname));

  return (
    <>
      <header
        dir={dir}
        data-scene={isNavInverted ? "inverted" : undefined}
        className={cn(
          // Above the drawer (z-40) so the close button stays reachable.
          "fixed top-0 z-50 w-full transition-colors duration-300",
          isScrolled && !isMobileMenuOpen ? "liquid-glass" : "bg-transparent",
        )}
      >
        <Container>
          <div className="flex md:h-16 h-14 items-center">
            <div
              className="hidden lg:grid w-full items-center gap-8"
              style={{ gridTemplateColumns: "1fr 2fr 1fr" }}
            >
              <div className="flex order-1 justify-start">
                <Link href="/" className="flex items-baseline gap-1 group">
                  <AltruvexLogo size="md" variant="full" />
                </Link>
              </div>
              <nav className="flex items-center justify-center gap-1 order-2">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative rounded-md px-3 py-2 font-mono text-sm font-medium uppercase leading-normal tracking-wider text-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-brand after:origin-center after:transition-transform after:duration-300 motion-reduce:after:transition-none",
                        isActive
                          ? "text-brand-text after:scale-x-100"
                          : "transition-all text-primary/65 hover:text-foreground after:bg-foreground/25 after:scale-x-0 hover:after:scale-x-100",
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2 order-3 justify-end text-nowrap">
              <LanguageSwitcherBase variant="default" />
                <NavDivider />
                <ThemeChanger />
                <NavDivider />
                <Link
                  href="/transparency"
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isNavInverted
                      ? "transition-all bg-foreground text-inverted-bg hover:bg-foreground/90"
                      : "transition-all bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {t("getStarted")}
                </Link>
              </div>
            </div>
            <div className="flex lg:hidden w-full items-center justify-between">
              <Link href="/" className="flex items-baseline gap-1 group z-50">
                <AltruvexLogo size="md" variant="full" />
              </Link>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={toggleMobileMenu}
                className="relative z-50 flex h-11 w-11 items-center justify-center"
                aria-label={isMobileMenuOpen ? t("closeMenu") : t("openMenu")}
                aria-expanded={isMobileMenuOpen}
              >
                <span
                  className={cn(
                    "absolute h-[2px] w-full transition-transform duration-300 ease-out",
                    "bg-foreground",
                    isMobileMenuOpen
                      ? "rotate-45 translate-y-0"
                      : "translate-y-[-6px]",
                  )}
                />
                <span
                  className={cn(
                    "absolute h-[2px] w-full transition-transform duration-300 ease-out",
                    "bg-foreground",
                    isMobileMenuOpen
                      ? "-rotate-45 translate-y-0"
                      : "translate-y-[6px]",
                  )}
                />
              </button>
            </div>
          </div>
        </Container>
      </header>
      <NavDrawer
        open={isMobileMenuOpen}
        onClose={closeMobileMenu}
        items={NAV_ITEMS}
        triggerRef={menuButtonRef}
      />
    </>
  );
}

function NavDivider() {
  return (
    <div className="h-4 w-px ltr:mx-1 rtl:mx-1 bg-border-mid transition-colors duration-300" />
  );
}
