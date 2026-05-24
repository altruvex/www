"use client";

import { Container } from "@/components/container";
import { LanguageChanger } from "@/components/language-switcher";
import { ThemeChanger } from "@/components/theme-changer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Link, usePathname } from "@/i18n/navigation";
import { gsap } from "@/lib/gsap";
import { MOTION } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AltruvexLogo } from "./altruvex-logo";
import { MagneticButton } from "./magnetic-button";
import { useLoading } from "./providers/loading-provider";

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
  const [isClosing, setIsClosing] = useState(false);

  const { isInitialLoadComplete } = useLoading();

  const logoRef = useRef<HTMLAnchorElement>(null);
  const navItemsRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRTL = locale === "ar";

  useLockBodyScroll(isMobileMenuOpen && !isClosing);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // [GSAP Logic Remains Unchanged for Desktop]
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    if (!logoRef.current || !navItemsRef.current || !actionsRef.current) return;

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const navChildren = navItemsRef.current?.children;
      if (reduced) {
        gsap.set([logoRef.current, actionsRef.current], { opacity: 1, y: 0 });
        if (navChildren?.length) gsap.set(Array.from(navChildren), { opacity: 1, y: 0 });
        return;
      }
      
      gsap.set([logoRef.current, actionsRef.current], { opacity: 0, y: -10 });
      if (navChildren?.length) gsap.set(Array.from(navChildren), { opacity: 0, y: -10 });

      const tl = gsap.timeline({
        defaults: { ease: MOTION.ease.smooth, duration: MOTION.duration.base },
      });
      tl.to(logoRef.current, { opacity: 1, y: 0 });
      if (navChildren?.length) {
        tl.to(Array.from(navChildren), { opacity: 1, y: 0, stagger: MOTION.stagger.tight }, "-=0.35");
      }
      tl.to(actionsRef.current, { opacity: 1, y: 0 }, "-=0.25");
    });
    return () => ctx.revert();
  }, [isInitialLoadComplete]);

  const closeMobileMenu = useCallback(() => {
    if (!mobileMenuRef.current) {
      setIsMobileMenuOpen(false);
      return;
    }
    setIsClosing(true);
    const items = mobileMenuRef.current.querySelectorAll(".mobile-menu-item");
    if (items.length > 0) {
      gsap.to(Array.from(items), {
        opacity: 0,
        x: isRTL ? 20 : -20,
        duration: MOTION.duration.fast,
        stagger: MOTION.stagger.tight,
        ease: MOTION.ease.ui,
      });
    }
    gsap.to(mobileMenuRef.current, {
      opacity: 0,
      y: -20,
      duration: MOTION.duration.fast,
      ease: MOTION.ease.ui,
      onComplete: () => {
        setIsMobileMenuOpen(false);
        setIsClosing(false);
      },
    });
  }, [isRTL]);

  useEffect(() => {
    if (!mobileMenuRef.current || !isMobileMenuOpen || isClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(mobileMenuRef.current, { opacity: 1, y: 0 });
      const items = mobileMenuRef.current.querySelectorAll(".mobile-menu-item");
      if (items.length > 0) gsap.set(Array.from(items), { opacity: 1, x: 0 });
      return;
    }
    gsap.fromTo(
      mobileMenuRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: MOTION.duration.fast, ease: MOTION.ease.smooth }
    );
    const items = mobileMenuRef.current.querySelectorAll(".mobile-menu-item");
    if (items.length > 0) {
      gsap.fromTo(
        Array.from(items),
        { opacity: 0, x: isRTL ? 20 : -20 },
        { opacity: 1, x: 0, duration: MOTION.duration.fast, stagger: MOTION.stagger.base, ease: MOTION.ease.smooth }
      );
    }
  }, [isMobileMenuOpen, isClosing, isRTL]);

  const toggleMobileMenu = useCallback(
    () => (isMobileMenuOpen ? closeMobileMenu() : setIsMobileMenuOpen(true)),
    [isMobileMenuOpen, closeMobileMenu]
  );
  return (
    <>
      <header
        dir={dir}
        className={cn(
          "fixed top-0 z-40 w-full transition-all duration-500",
          isInitialLoadComplete
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
          isScrolled
            ? "liquid-glass"
            : "bg-transparent",
        )}
      >
        <Container>
          <div className="flex h-16 items-center">
            <div
              className="hidden lg:grid w-full items-center gap-8"
              style={{ gridTemplateColumns: "1fr 2fr 1fr" }}
            >
              <div className="flex order-1 justify-start">
                <Link
                  ref={logoRef}
                  href="/"
                  className="flex items-baseline gap-1 group"
                >
                  <AltruvexLogo size="md" variant="full" />
                </Link>
              </div>
              <nav
                ref={navItemsRef}
                className="flex items-center justify-center gap-1 order-2"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="group relative rounded-full px-3 py-1.5 font-mono text-sm leading-normal tracking-wider ltr:font-medium font-bold uppercase text-nowrap text-primary/60 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t(item.key)}
                    <span className="absolute -bottom-1 left-0 right-0 h-px bg-transparent group-hover:bg-foreground/25 transition-all duration-300" />
                  </Link>
                ))}
              </nav>
              <div
                ref={actionsRef}
                className="flex items-center gap-2 order-3 justify-end text-nowrap"
              >
                <LanguageChanger />
                <NavDivider />
                <ThemeChanger />
                <NavDivider />
                <Link href="/transparency">
                  <MagneticButton className="w-full flex items-center justify-center">
                    <span>{t("getStarted")}</span>
                  </MagneticButton>
                </Link>
              </div>
            </div>
            <div className="flex lg:hidden w-full items-center justify-between">
              <Link
                ref={logoRef}
                href="/"
                className="flex items-baseline gap-1 group z-50"
              >
                <AltruvexLogo size="md" variant="full" />
              </Link>
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="relative z-50 flex h-11 w-11 items-center justify-center"
                aria-label={isMobileMenuOpen ? t("closeMenu") : t("openMenu")}
              >
                <span
                  className={cn(
                    "absolute h-[2px] w-full bg-foreground transition-all duration-300 ease-in-out",
                    isMobileMenuOpen
                      ? "rotate-45 translate-y-0"
                      : "-translate-y-[6px]",
                  )}
                />
                <span
                  className={cn(
                    "absolute h-[2px] w-full bg-foreground transition-all duration-300 ease-in-out",
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
      {(isMobileMenuOpen || isClosing) && (
        <div
          dir={dir}
          ref={mobileMenuRef}
          className="fixed inset-0 z-40 liquid-glass lg:hidden bg-background/95 backdrop-blur-xl"
          style={{ top: "64px" }}
        >
          <Container className="h-full">
            <ScrollArea className="h-[calc(100vh-128px)] w-full" dir={dir}>
              <div className="flex flex-col h-full py-8">
                <nav className="flex-1 space-y-2 mb-12">
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <div key={item.key} className="mobile-menu-item overflow-hidden">
                        <Link href={item.href} onClick={closeMobileMenu}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-4 py-4 transition-colors duration-200",
                              isActive ? "bg-foreground/5 text-foreground" : "text-foreground/70 hover:bg-foreground/5"
                            )}
                          >
                            <span className="font-sans text-2xl font-semibold tracking-tighter">
                              {t(item.key)}
                            </span>
                          </button>
                        </Link>
                      </div>
                    );
                  })}
                </nav>
                <div className="space-y-6 mt-auto">
                  <div className="h-px w-full bg-foreground/10" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="mobile-menu-item">
                      <Link href="/transparency" className="block" onClick={closeMobileMenu}>
                        <MagneticButton className="w-full justify-center">
                          <span>{t("getStarted")}</span>
                        </MagneticButton>
                      </Link>
                    </div>
                    <div className="mobile-menu-item">
                      <Link href="/schedule" className="block" onClick={closeMobileMenu}>
                        <MagneticButton variant="secondary" className="w-full justify-center">
                          <Calendar className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          <span>{t("schedule")}</span>
                        </MagneticButton>
                      </Link>
                    </div>
                  </div>
                  <div className="h-px w-full bg-foreground/10" />
                  <div className="space-y-4 pb-8">
                    <div className="mobile-menu-item flex items-center justify-between rounded-xl bg-foreground/5 px-4 py-3">
                      <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                        {t("language")}
                      </span>
                      <LanguageChanger />
                    </div>
                    <div className="mobile-menu-item flex items-center justify-between rounded-xl bg-foreground/5 px-4 py-3">
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
  return <div className="h-4 w-px bg-foreground/8 ltr:mx-1 rtl:mx-1" />;
}
