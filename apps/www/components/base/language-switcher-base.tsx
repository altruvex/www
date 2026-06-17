"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type LanguageSwitcherVariant = "default" | "compact" | "toggle";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: "ltr" | "rtl";
}

const focusRingClasses =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const LANGUAGES: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "US",
    direction: "ltr",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "EG",
    direction: "rtl",
  },
];

interface LanguageSwitcherBaseProps {
  variant?: LanguageSwitcherVariant;
  className?: string;
}

export function LanguageSwitcherBase({
  variant = "default",
  className,
}: LanguageSwitcherBaseProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left?: number;
    right?: number;
  }>({ top: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLang =
    LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0];
  const isRTL = currentLang.direction === "rtl";

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    startTransition(() => {
      let newPath = pathname;
      if (pathname === `/${locale}`) {
        newPath = `/${newLocale}`;
      } else if (pathname.startsWith(`/${locale}/`)) {
        newPath = pathname.replace(`/${locale}/`, `/${newLocale}/`);
      } else {
        newPath = `/${newLocale}${
          pathname.startsWith("/") ? pathname : `/${pathname}`
        }`;
      }

      router.push(newPath);
      setIsOpen(false);
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateMenuPosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;

        const menuWidth =
          menuRef.current?.offsetWidth || (variant === "compact" ? 160 : 192);

        let leftPos: number | undefined;
        let rightPos: number | undefined;

        if (isRTL) {
          rightPos = viewportWidth - rect.right;
          if (rect.right - menuWidth < 16) {
            rightPos = undefined;
            leftPos = 16;
          }
        } else {
          leftPos = rect.left;
          if (leftPos + menuWidth > viewportWidth - 16) {
            leftPos = undefined;
            rightPos = viewportWidth - rect.right;
          }
        }

        setMenuPosition({
          top: rect.bottom + 8,
          left: leftPos,
          right: rightPos,
        });
      }
    };

    if (isOpen) {
      updateMenuPosition();
      window.addEventListener("scroll", updateMenuPosition, true);
      window.addEventListener("resize", updateMenuPosition, true);
    }

    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition, true);
    };
  }, [isOpen, isRTL, variant]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (variant === "toggle") {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={cn(
          "flex items-center gap-1 liquid-glass rounded-xl p-1 outline-none",
          isPending && "opacity-70 pointer-events-none",
          className,
        )}
      >
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code;

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => switchLocale(lang.code)}
              className={cn(
                "relative z-10 px-3 py-1.5 font-mono text-sm rounded-lg font-medium leading-normal tracking-wider uppercase transition-all duration-300",
                focusRingClasses,
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-primary/60 hover:bg-foreground/10 hover:text-primary",
              )}
              aria-label={`Switch to ${lang.name}`}
              aria-pressed={isActive}
              disabled={isPending}
            >
              {lang.code}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <>
      <div
        className={cn("relative inline-block", className)}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "group flex items-center gap-2 rounded-lg liquid-glass-flat transition-all duration-300",
            "hover:bg-foreground/5",
            focusRingClasses,
            isPending && "opacity-70 cursor-not-allowed",
            variant === "compact"
              ? "h-12 w-12 sm:h-9 sm:w-9 p-0 justify-center"
              : "px-3 py-1.5",
          )}
          aria-label="Select language"
          aria-expanded={isOpen}
          disabled={isPending}
        >
          {variant === "compact" ? (
            <>
              <Globe
                className="h-4 w-4 mx-auto text-primary/80"
                strokeWidth={2.5}
              />
              <span
                className={cn(
                  "absolute -top-1 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[13px] font-bold leading-none",
                  "bg-primary text-primary-foreground",
                  isRTL ? "-left-1" : "-right-1",
                )}
              >
                {currentLang.code.charAt(0).toUpperCase()}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/80">
                {currentLang.code}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-300 text-primary/60",
                  isOpen && "rotate-180",
                )}
              />
            </>
          )}
        </button>
      </div>
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              ...(menuPosition.left !== undefined
                ? { left: `${menuPosition.left}px` }
                : {}),
              ...(menuPosition.right !== undefined
                ? { right: `${menuPosition.right}px` }
                : {}),
              zIndex: 50,
            }}
            className={cn(
              "rounded-xl liquid-glass p-1 shadow-lg outline-none",
              "animate-in fade-in zoom-in-95 duration-200 ease-out origin-top",
              variant === "compact" ? "w-40" : "w-48",
            )}
            role="menu"
            aria-orientation="vertical"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {LANGUAGES.map((lang) => {
              const isActive = locale === lang.code;
              const langIsRTL = lang.direction === "rtl";
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => switchLocale(lang.code)}
                  dir={langIsRTL ? "rtl" : "ltr"}
                  className={cn(
                    "flex w-full items-center justify-between transition-colors rounded-lg",
                    focusRingClasses,
                    variant === "compact"
                      ? "gap-2 px-3 py-2"
                      : "gap-3 px-4 py-2.5",
                    isActive
                      ? "bg-foreground/15 text-primary font-medium"
                      : "text-primary/80 hover:bg-foreground/10 hover:text-primary",
                    langIsRTL ? "text-right" : "text-left",
                  )}
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                >
                  <div className="flex items-center gap-2">
                    {variant === "compact" ? (
                      <span className="text-xs font-medium">
                        {lang.nativeName}
                      </span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {lang.nativeName}
                        </span>
                        <span className="font-mono text-xs tracking-wider text-primary/50">
                          {lang.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <Check
                      className={cn(
                        "shrink-0 text-primary",
                        variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
                      )}
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}