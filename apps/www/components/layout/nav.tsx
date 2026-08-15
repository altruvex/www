"use client";

import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Link, usePathname } from "@/i18n/navigation";
import { getLenis } from "@/lib/motion/lenis-instance";
import { cn } from "@/lib/utils/utils";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcherBase } from "../base/language-switcher-base";
import { AltruvexLogo } from "../shared/altruvex-logo";

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

  useEffect(() => {
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

    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    check();

    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      ro.disconnect();
    };
  }, [isMobileMenuOpen]);

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
      dir={dir}
      data-scene={isNavInverted ? "inverted" : undefined}
      className={cn(
        "fixed top-0 w-full transition-all duration-300",
        isMobileMenuOpen
          ? "z-60 bg-transparent"
          : cn("z-40", isScrolled ? "liquid-glass" : "bg-transparent"),
      )}
    >
      <Container>
        <div className="flex md:h-16 h-14 items-center">
          {/* تم تعديل هذا الجزء فقط لحل مشكلة المحاذاة */}
          <div className="hidden lg:flex w-full items-center justify-between gap-8">
            <div className="flex flex-1 justify-start">
              <Link href="/" className="flex items-baseline gap-1 group">
                <AltruvexLogo size="md" variant="full" />
              </Link>
            </div>

            <nav className="flex items-center justify-center gap-1">
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

            <div className="flex flex-1 items-center gap-2 justify-end text-nowrap">
              <LanguageSwitcherBase variant="default" />
              <NavDivider />
              <ThemeChanger />
              <NavDivider />
              <Link
                href="/transparency"
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isNavInverted
                    ? "transition-all bg-foreground text-inverted-bg hover:bg-foreground/90"
                    : "transition-all bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                {t("getStarted")}
              </Link>
            </div>
          </div>
          {/* نهاية الجزء المعدل */}

          <div className="flex lg:hidden w-full items-center justify-between">
            <Link href="/" className="flex items-baseline gap-1 group z-50">
              <AltruvexLogo size="md" variant="full" />
            </Link>
            <div className="h-full flex items-center justify-center">
              <Drawer
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="relative z-50 flex h-11 w-11 items-center justify-center focus-visible:outline-none"
                    aria-label={
                      isMobileMenuOpen ? t("closeMenu") : t("openMenu")
                    }
                  >
                    <span
                      className={cn(
                        "absolute h-0.5 w-10 rounded-full transition-transform duration-300 ease-out bg-foreground",
                        isMobileMenuOpen
                          ? "rotate-45 translate-y-0"
                          : "-translate-y-1.5",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute h-0.5 w-10 rounded-full transition-transform duration-300 ease-out bg-foreground",
                        isMobileMenuOpen
                          ? "-rotate-45 translate-y-0"
                          : "translate-y-1.5",
                      )}
                    />
                  </button>
                </DrawerTrigger>
                <DrawerContent
                  dir={dir}
                  data-lenis-prevent
                  className="liquid-glass-panel h-[85svh] border-foreground/10 px-6 outline-none sm:px-8 lg:hidden"
                >
                  <DrawerHeader className="sr-only">
                    <DrawerTitle>{t("menuTitle")}</DrawerTitle>
                    <DrawerDescription>
                      {t("menuDescription")}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div
                    dir={dir}
                    className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="flex min-h-full flex-col">
                      <nav className="flex flex-col space-y-2 mb-12">
                        {NAV_ITEMS.map((item) => {
                          const isActive =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              onClick={closeMobileMenu}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "flex w-full items-center rounded-md border-s-2 px-4 py-4 transition-colors duration-200",
                                isActive
                                  ? "bg-brand/10 text-brand-text border-brand"
                                  : "border-transparent text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                              )}
                            >
                              <span className="font-sans text-xl font-medium tracking-tight text-start">
                                {t(item.key)}
                              </span>
                            </Link>
                          );
                        })}
                      </nav>
                      <div className="space-y-6 mt-auto pb-6">
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
                        <div className="space-y-4">
                          <div className="flex items-center justify-between rounded-md bg-foreground/5 px-4 py-3">
                            <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                              {t("language")}
                            </span>
                            <LanguageSwitcherBase variant="toggle" />
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
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}

function NavDivider() {
  return (
    <div className="h-4 w-px mx-1 bg-border-mid transition-colors duration-300" />
  );
}