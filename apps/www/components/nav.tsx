"use client";

import { Container } from "@/components/container";
import { LanguageChanger } from "@/components/language-switcher";
import { ThemeChanger } from "@/components/theme-changer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AltruvexLogo } from "./altruvex-logo";

const NAV_ITEMS = [
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavInverted, setIsNavInverted] = useState(false);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useLockBodyScroll(isMobileMenuOpen);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const servicesWrapper = document.getElementById("services-wrapper");
      if (servicesWrapper) {
        const rect = servicesWrapper.getBoundingClientRect();
        const overlaps = rect.top <= 64 && rect.bottom >= 0;
        setIsNavInverted(overlaps && !isMobileMenuOpen);
      } else {
        setIsNavInverted(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen((open) => !open);

  return (
    <>
      <header
        dir={dir}
        data-scene={isNavInverted ? "inverted" : undefined}
        className={cn(
          "fixed top-0 z-40 w-full transition-colors duration-300",
          isScrolled ? "liquid-glass" : "bg-transparent",
        )}
      >
        <Container>
          <div className="flex h-16 items-center">
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
                      className={cn(
                        "rounded-md px-3 py-2 font-mono text-sm font-medium uppercase leading-normal tracking-wider text-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors duration-300",
                        isActive
                          ? "bg-foreground/8 text-foreground"
                          : "text-primary/65 hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2 order-3 justify-end text-nowrap">
                <LanguageChanger />
                <NavDivider />
                <ThemeChanger />
                <NavDivider />
                <Link
                  href="/transparency"
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isNavInverted
                      ? "bg-foreground text-inverted-bg hover:bg-foreground/90"
                      : "bg-foreground text-background hover:bg-foreground/90",
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
      {isMobileMenuOpen && (
        <div
          dir={dir}
          className="liquid-glass-panel fixed inset-0 z-40 border-t border-foreground/10 lg:hidden motion-safe:animate-[menu-panel-in_0.25s_cubic-bezier(0.23,1,0.32,1)_both]"
          style={{ top: "64px" }}
        >
          <Container className="h-full">
            <ScrollArea className="h-[calc(100vh-128px)] w-full" dir={dir}>
              <div className="flex flex-col h-full py-8">
                <nav className="flex-1 space-y-2 mb-12">
                  {NAV_ITEMS.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "flex w-full items-center rounded-md px-4 py-4",
                          isActive
                            ? "bg-foreground/8 text-foreground"
                            : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                        )}
                      >
                        <span className="font-sans text-2xl font-semibold tracking-tight">
                          {t(item.key)}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="space-y-6 mt-auto">
                  <div className="h-px w-full bg-foreground/10" />
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href="/transparency"
                      className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
                      onClick={closeMobileMenu}
                    >
                      {t("getStarted")}
                    </Link>
                    <Link
                      href="/schedule"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-foreground/10 px-4 text-sm font-medium text-foreground"
                      onClick={closeMobileMenu}
                    >
                      <Calendar className="h-4 w-4" />
                      {t("schedule")}
                    </Link>
                  </div>
                  <div className="h-px w-full bg-foreground/10" />
                  <div className="space-y-4 pb-8">
                    <div className="flex items-center justify-between rounded-md bg-foreground/5 px-4 py-3">
                      <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                        {t("language")}
                      </span>
                      <LanguageChanger />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-foreground/5 px-4 py-3">
                      <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                        {t("theme")}
                      </span>
                      <ThemeChanger />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Container>
        </div>
      )}
    </>
  );
}

function NavDivider() {
  return (
    <div className="h-4 w-px ltr:mx-1 rtl:mx-1 bg-border-mid transition-colors duration-300" />
  );
}
