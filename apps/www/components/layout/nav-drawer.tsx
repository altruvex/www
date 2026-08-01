"use client";

import { LanguageSwitcherBase } from "@/components/base/language-switcher-base";
import { Container } from "@/components/shared/container";
import { ThemeChanger } from "@/components/shared/theme-changer";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

/** Milliseconds the exit animation runs before the overlay is unmounted. */
const EXIT_MS = 220;

export type NavDrawerItem = {
  key: string;
  href: string;
};

type NavDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: readonly NavDrawerItem[];
  /** Focus returns here when the drawer closes. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

/** Cairo wall-clock, `HH:MM`. Rendered client-only to avoid a hydration split. */
function useCairoTime(active: boolean): string | null {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    const format = (): void => {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Cairo",
        }).format(new Date()),
      );
    };

    format();
    const id = window.setInterval(format, 30_000);
    return () => window.clearInterval(id);
  }, [active]);

  return time;
}

/**
 * The mobile site index.
 *
 * Deliberately NOT a stack of buttons: it reads as a numbered manifest —
 * mono ordinal, Outfit label, one-line descriptor, hairline rules, and a rail
 * running the length of the list. Same grammar as the site's section eyebrows.
 *
 * Mechanics that matter (all three were live bugs):
 *  - rendered through a portal on `document.body`, so no ancestor transform
 *    (the GSAP route transition in template.tsx) can break `position: fixed`;
 *  - the scroller is a plain overflow container tagged `data-lenis-prevent`,
 *    because Lenis swallows wheel events globally and would otherwise scroll
 *    the page behind the drawer instead of the drawer itself;
 *  - the panel is one `100dvh` flex column, so the scroller owns exactly the
 *    space left over — no `calc(100vh - …)` guess that leaves dead rows.
 */
export function NavDrawer({ open, onClose, items, triggerRef }: NavDrawerProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  // `closing` keeps the tree alive for one exit animation after `open` drops.
  // Derived during render (the documented "adjust state when a prop changes"
  // pattern) rather than in an effect, so there is no extra render pass.
  const [previousOpen, setPreviousOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  if (previousOpen !== open) {
    setPreviousOpen(open);
    setClosing(previousOpen && !open);
  }

  const dir = locale === "ar" ? "rtl" : "ltr";
  const rendered = open || closing;
  const cairoTime = useCairoTime(rendered);

  useLockBodyScroll(rendered);

  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => setClosing(false), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [closing]);

  // Move focus into the panel on open, and hand it back to the trigger after.
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    panelRef.current
      ?.querySelector<HTMLElement>("a[href]")
      ?.focus({ preventScroll: true });

    return () => {
      trigger?.focus({ preventScroll: true });
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleNavigate = useCallback((): void => onClose(), [onClose]);

  if (!rendered || typeof document === "undefined") return null;

  const total = String(items.length).padStart(2, "0");

  return createPortal(
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={t("drawerTitle")}
      className={cn(
        "fixed inset-0 z-40 lg:hidden",
        // Exactly one of these — both resolve to the same utility layer, so
        // applying both would let CSS order, not class order, pick the winner.
        closing
          ? "motion-safe:animate-drawer-scrim-out"
          : "motion-safe:animate-drawer-scrim-in",
      )}
    >
      <div
        ref={panelRef}
        className="nav-drawer-surface flex h-[100dvh] flex-col"
      >
        {/* Gutter for the fixed header, which stays above the drawer. */}
        <div className="h-14 shrink-0 md:h-16" aria-hidden />

        <div
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <Container className="flex min-h-full flex-col pb-10 pt-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow tone="muted">{t("index")}</Eyebrow>
              <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                {total}
              </span>
            </div>

            <nav aria-label={t("drawerTitle")} className="relative mt-4">
              {/* Rail: the list's spine, same idiom as the services section. */}
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 w-px origin-top bg-border motion-safe:animate-drawer-rail-in"
              />
              <ul>
                {items.map((item, index) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li
                      key={item.key}
                      className="drawer-row"
                      style={{ "--row": index } as CSSProperties}
                    >
                      <Link
                        href={item.href}
                        onClick={handleNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group relative grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-x-3 border-b border-border/70 py-4 ps-4",
                          "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          isActive
                            ? "text-brand-text"
                            : "text-foreground hover:text-brand-text",
                        )}
                      >
                        {isActive ? (
                          // Lights up this row's segment of the rail.
                          <span
                            aria-hidden
                            className="absolute inset-y-0 start-0 w-0.5 bg-brand"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums transition-colors duration-200",
                            isActive
                              ? "text-brand-text"
                              : "text-muted-foreground/70",
                          )}
                          aria-hidden
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-sans text-2xl font-semibold leading-tight tracking-tight">
                            {t(item.key)}
                          </span>
                          <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                            {t(`indexDescriptions.${item.key}`)}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          className={cn(
                            "h-4 w-4 self-center transition-[opacity,transform] duration-200 rtl:-scale-x-100",
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div
              className="drawer-row mt-8 grid gap-2"
              style={{ "--row": items.length } as CSSProperties}
            >
              <Link
                href="/transparency"
                onClick={handleNavigate}
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t("getStarted")}
              </Link>
              <Link
                href="/schedule"
                onClick={handleNavigate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-border-mid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
                {t("schedule")}
              </Link>
            </div>

            {/* Settings read as spec rows — hairlines, not filled cards. */}
            <div
              className="drawer-row mt-8"
              style={{ "--row": items.length + 1 } as CSSProperties}
            >
              <div className="flex items-center justify-between border-t border-border py-3">
                <Eyebrow tone="muted" className="text-xs">
                  {t("language")}
                </Eyebrow>
                <LanguageSwitcherBase variant="toggle" />
              </div>
              <div className="flex items-center justify-between border-t border-border py-3">
                <Eyebrow tone="muted" className="text-xs">
                  {t("theme")}
                </Eyebrow>
                <ThemeChanger />
              </div>
            </div>

            <div
              className="drawer-row mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
              style={{ "--row": items.length + 2 } as CSSProperties}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-success"
                />
                {t("status")}
              </span>
              <span aria-hidden className="text-border-mid">
                /
              </span>
              <span className="tabular-nums">
                {t("base")}
                {cairoTime ? ` ${cairoTime}` : ""}
              </span>
            </div>
          </Container>
        </div>
      </div>
    </div>,
    document.body,
  );
}
