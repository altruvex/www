"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import { getCommercialCta } from "@/lib/config/commercial";
import { cn } from "@/lib/utils/utils";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import {
  magneticButtonRadii,
  magneticButtonSizes,
  magneticButtonVariants,
} from "@repo/ui/www";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Scroll distance before the bar appears. */
const REVEAL_AFTER = 240;

/** Pages that are themselves the contact step carry no bar. */
const HIDDEN_ON = ["/contact", "/schedule"];

export function showsMobileContactBar(pathname: string) {
  return !HIDDEN_ON.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * The space the bar takes at the bottom of a phone screen. MainLayoutContent
 * pads the page sheet by this much below `md`, so the bar never sits over the
 * last controls on a page.
 */
export const MOBILE_CONTACT_BAR_SPACE =
  "max-md:pb-[calc(3.75rem+env(safe-area-inset-bottom))]";

const TEXT_ENTRY = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

const buttonBase =
  "relative inline-flex items-center justify-center gap-2 font-medium outline-none transition-[background-color,border-color,color] duration-(--motion-drawer) ease-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function MobileContactBar() {
  const pathname = usePathname();
  if (!showsMobileContactBar(pathname)) return null;
  return <Bar />;
}

function Bar() {
  const t = useTranslations("common.mobileContactBar");
  const ctaT = useTranslations("commercial.ctas");
  const [scrolled, setScrolled] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [typing, setTyping] = useState(false);

  // The footer is a sticky curtain under the page sheet, so it is always
  // "in" the viewport; it shows once the sheet's bottom edge rises above the
  // screen's bottom edge. One passive listener, read once per frame.
  useEffect(() => {
    const sheet = document
      .getElementById("main-content")
      ?.querySelector(":scope > footer")?.previousElementSibling;
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > REVEAL_AFTER);
      setFooterInView(
        sheet ? sheet.getBoundingClientRect().bottom < window.innerHeight : false,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // The on-screen keyboard and the bar never share the screen.
  useEffect(() => {
    const isTextEntry = (el: Element | null) => !!el?.closest(TEXT_ENTRY);
    const onFocusIn = (e: FocusEvent) => {
      if (isTextEntry(e.target as Element | null)) setTyping(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      setTyping(isTextEntry(e.relatedTarget as Element | null));
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const visible = scrolled && !footerInView && !typing;
  const whatsappHref = `${getWhatsAppUrl()}?text=${encodeURIComponent(t("whatsappMessage"))}`;

  return (
    <nav
      aria-label={t("label")}
      inert={!visible}
      data-visible={visible ? "" : undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 isolate md:hidden",
        "px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        "translate-y-2 opacity-0 pointer-events-none transition-[opacity,translate] duration-(--motion-drawer) ease-(--ease-strong) motion-reduce:transition-none",
        "data-visible:translate-y-0 data-visible:opacity-100 data-visible:pointer-events-auto",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 liquid-glass-clear liquid-glass-clear-dense rounded-none! border-x-0! border-b-0!"
      />
      <div className="flex items-center gap-2">
        <Link
          href={getCommercialCta("describeTheBuild").href}
          onClick={() =>
            trackEvent("cta_clicked", {
              ctaId: "mobile_bar_start",
              source: "mobile_contact_bar",
            })
          }
          className={cn(
            buttonBase,
            magneticButtonVariants.primary,
            magneticButtonSizes.default,
            magneticButtonRadii.default,
            "flex-1 sm:min-h-11",
          )}
        >
          {ctaT("describeTheBuild")}
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("cta_clicked", {
              ctaId: "mobile_bar_whatsapp",
              source: "mobile_contact_bar",
            })
          }
          className={cn(
            buttonBase,
            magneticButtonVariants.secondary,
            magneticButtonSizes.default,
            magneticButtonRadii.default,
            "sm:min-h-11",
          )}
        >
          <MessageCircle aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          {t("whatsapp")}
        </a>
      </div>
    </nav>
  );
}
