"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { SITE_CONFIG } from "@/lib/metadata";
import { readMotionEnv, scrollToY } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { useLocale, useTranslations } from "next-intl";
import { memo, useEffect, useMemo, useRef, useState } from "react";

/*
 * The curtain footer — prototype A of docs/prototypes/2026-10-footer, with the
 * wordmark Ali asked to keep (2026-10-03).
 *
 * The page lifts off a dark ground that was under it all along: the content
 * wrapper in main-layout-content.tsx carries the background and a panel-lg
 * bottom edge, and this footer sits beneath it, sticky at the bottom. When the
 * footer is taller than the viewport, a negative `bottom` pins its TOP instead,
 * so the reveal always starts at the closing line. Locked dark in both themes:
 * the closing page of the dark sandwich (ADI RUL-134).
 *
 * The wordmark is fitted to the column, never cropped: its width is
 * WORDMARK_EM × font-size in Altruvex Sans 700 at -0.05em, so a font-size of
 * 100cqi / WORDMARK_EM spans the container exactly (globals.css keeps the
 * Latin face and tracking under RTL). It rises once from its own baseline when
 * the page uncovers it; with reduced motion it simply rests.
 */
const WORDMARK_EM = 3.547; // "Altruvex" advance width, measured
const WORDMARK_FONT_SIZE = `${Math.floor((100 / WORDMARK_EM) * 10) / 10}cqi`; // 28.1cqi

const linkClass =
  "relative inline-flex min-h-8 items-center text-[0.9375rem] text-muted-foreground transition-colors duration-(--motion-instant) hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-ctl-xs pointer-coarse:min-h-11 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-(--motion-drawer) after:ease-(--ease-strong) hover:after:scale-x-100 focus-visible:after:scale-x-100 rtl:after:origin-right";

type MarkState = "rest" | "armed" | "in";

export const Footer = memo(function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");
  const tCTAs = useTranslations("commercial.ctas");
  const locale = useLocale();

  const footerRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [overhang, setOverhang] = useState(0);
  const [markState, setMarkState] = useState<MarkState>("rest");

  // Sticky bottom only holds while the footer fits the viewport; past that,
  // a negative offset keeps its top in view as the page lifts away.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const measure = () =>
      setOverhang(Math.min(0, window.innerHeight - footer.offsetHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The footer is in the viewport from the first frame, under the page, so
  // "in view" means uncovered: the sheet's bottom edge has passed the mark.
  useEffect(() => {
    const mark = markRef.current;
    const sheet = footerRef.current?.previousElementSibling;
    if (!mark || !sheet || readMotionEnv().reduce) return;
    const uncovered = () => {
      const box = mark.getBoundingClientRect();
      const edge = Math.max(sheet.getBoundingClientRect().bottom, 0);
      return box.top < window.innerHeight && edge < box.bottom - box.height * 0.3;
    };
    if (uncovered()) return;
    setMarkState("armed");
    const onScroll = () => {
      if (!uncovered()) return;
      setMarkState("in");
      window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const localizedYear = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return locale === "ar" ? localizeNumbers(year, locale) : year;
  }, [locale]);

  const linkColumns = useMemo(
    () => [
      {
        title: t("servicesTitle"),
        links: [
          { href: "/services/interface-design", label: t("webDesign") },
          { href: "/services/development", label: t("development") },
          { href: "/services/consulting", label: t("consulting") },
          { href: "/services/maintenance", label: t("maintenance") },
        ],
      },
      {
        title: t("companyTitle"),
        links: [
          { href: "/work", label: t("work") },
          { href: "/approach", label: t("approach") },
          { href: "/how-we-work", label: t("how-we-work") },
          { href: "/process", label: t("process") },
          { href: "/standards", label: t("standards") },
        ],
      },
      {
        title: t("resourcesTitle"),
        links: [
          { href: "/pricing", label: t("pricing") },
          { href: "/transparency", label: t("transparency") },
          { href: "/faq", label: t("faq") },
          { href: "/writing", label: t("writing") },
          { href: "/schedule", label: t("schedule") },
          { href: "/contact", label: t("contact") },
        ],
      },
    ],
    [t],
  );

  const legalLinks = [
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
    { href: "/about", label: navT("about") },
  ];

  return (
    <footer
      ref={footerRef}
      aria-labelledby="footer-close"
      data-scene="inverted"
      data-scene-lock="dark"
      data-nav-invert
      className="sticky z-0 -mt-(--radius-panel-lg) w-full bg-background"
      style={{ bottom: `${overhang}px` }}
    >
      <Container className="@container">
        <div className="flex flex-col gap-7 pt-[calc(clamp(3.5rem,7vw,6rem)+var(--radius-panel-lg))]">
          <Eyebrow>{t("studioLine")}</Eyebrow>
          <p
            id="footer-close"
            className="max-w-[12ch] text-[clamp(2.5rem,6.6vw,6.75rem)] leading-[0.98] font-medium tracking-[-0.035em] text-foreground rtl:max-w-[14ch] rtl:leading-[1.15] rtl:tracking-normal"
          >
            {t("closeLine")}{" "}
            <span className="text-muted-foreground">{t("closeLineDim")}</span>
          </p>
          <div className="grid items-end gap-7 xl:grid-cols-[1fr_auto]">
            <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
            <CtaButtonGroup
              primary={{
                href: getCommercialCta("projectRange").href,
                label: tCTAs("projectRange"),
              }}
              secondary={{
                href: getCommercialCta("technicalCall").href,
                label: tCTAs("technicalCall"),
              }}
              secondaryArrow
            />
          </div>
        </div>

        <nav
          aria-label={t("navLabel")}
          className="mt-[clamp(3rem,5vw,4.5rem)] grid grid-cols-2 gap-x-6 gap-y-9 border-t border-border-subtle pt-8 lg:grid-cols-4"
        >
          {linkColumns.map(({ title, links }) => (
            <div key={title}>
              <h3 className="eyebrow mb-3.5 text-muted-foreground">{title}</h3>
              <ul>
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="eyebrow mb-3.5 text-muted-foreground">{t("directLines")}</h3>
            <dl>
              <dt className="text-xs text-muted-foreground">{t("emailLabel")}</dt>
              <dd>
                <a href={`mailto:${SITE_CONFIG.email}`} className={linkClass}>
                  <bdi className="text-foreground">{SITE_CONFIG.email}</bdi>
                </a>
              </dd>
              <dt className="mt-3 text-xs text-muted-foreground">{t("whatsappLabel")}</dt>
              <dd>
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <bdi className="text-foreground">{SITE_CONFIG.phone}</bdi>
                </a>
              </dd>
            </dl>
          </div>
        </nav>

        <div className="mt-[clamp(2.25rem,4vw,3.5rem)] flex flex-wrap items-center justify-between gap-x-7 gap-y-3 border-t border-border-subtle py-5 text-[0.8125rem] text-muted-foreground">
          <span>{t("copyright", { year: localizedYear })}</span>
          <nav aria-label={t("legalLabel")}>
            <ul className="flex flex-wrap gap-x-5">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={cn(linkClass, "text-[0.8125rem]")}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            onClick={() => scrollToY(0)}
            className={cn(linkClass, "cursor-pointer text-[0.8125rem]")}
          >
            {t("toTop")}
          </button>
        </div>

        <div
          ref={markRef}
          aria-hidden="true"
          className="overflow-clip pt-[0.08em] pb-[0.012em] text-center leading-[0.74] select-none"
          style={{ fontSize: WORDMARK_FONT_SIZE }}
        >
          <span
            dir="ltr"
            data-wordmark
            data-state={markState}
            className="inline-block font-bold tracking-[-0.05em] whitespace-nowrap text-foreground data-[state=armed]:translate-y-[105%] data-[state=in]:translate-y-0 data-[state=in]:transition-transform data-[state=in]:duration-(--motion-display) data-[state=in]:ease-(--ease-strong)"
          >
            Altruvex
          </span>
        </div>
      </Container>
    </footer>
  );
});
