"use client";

import { Container } from "@/components/shared/container";
import { AltruvexWordmark } from "@repo/ui";
import { Eyebrow } from "@repo/ui/www";
import { Link, usePathname } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { SITE_CONFIG } from "@/lib/metadata";
import { readMotionEnv, scrollToY } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { useLocale, useTranslations } from "next-intl";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { LOCALE_META, nextLocale } from "@/i18n/locale-meta";

const WORDMARK_EM = 3.747;
const WORDMARK_FONT_SIZE = `${Math.floor((100 / WORDMARK_EM) * 10) / 10}cqi`;

const linkClass =
  "relative inline-flex min-h-8 items-center text-base text-muted-foreground transition-colors duration-(--motion-instant) hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-ctl-xs pointer-coarse:min-h-11 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-(--motion-drawer) after:ease-(--ease-strong) hover:after:scale-x-100 focus-visible:after:scale-x-100 rtl:after:origin-right";

type MarkState = "rest" | "armed" | "in";

export const Footer = memo(function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const footerRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [overhang, setOverhang] = useState(0);
  const [markState, setMarkState] = useState<MarkState>("rest");

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

  // Figures are Latin digits in every locale (2026-10-04), so the year needs no localizing.
  const localizedYear = new Date().getFullYear().toString();

  const linkColumns = useMemo(
    () => [
      {
        title: t("servicesTitle"),
        links: [
          { href: "/services", label: navT("all.services") },
          { href: "/services/interface-design", label: t("webDesign") },
          { href: "/services/development", label: t("development") },
          { href: "/services/consulting", label: t("consulting") },
          { href: "/services/maintenance", label: t("maintenance") },
          { href: "/pricing", label: t("pricing") },
          {
            href: getCommercialCta("projectRange").href,
            label: t("transparency"),
            hint: t("transparencyHint"),
          },
        ],
      },
      {
        title: navT("method"),
        links: [
          { href: "/process", label: t("process") },
          { href: "/how-we-work", label: t("how-we-work") },
          { href: "/approach", label: t("approach") },
          { href: "/standards", label: t("standards") },
          { href: "/faq", label: t("faq") },
        ],
      },
      {
        title: t("companyTitle"),
        links: [
          { href: "/work", label: t("work") },
          { href: "/about", label: navT("about") },
          { href: "/writing", label: t("writing") },
          { href: getCommercialCta("describeTheBuild").href, label: t("contact") },
        ],
      },
    ],
    [t, navT],
  );

  // Profiles come from config; an empty value is skipped rather than rendered.
  const socialLinks = [
    { href: SITE_CONFIG.founder.linkedin, label: "LinkedIn" },
    { href: SITE_CONFIG.founder.github, label: "GitHub" },
  ].filter(({ href }) => Boolean(href));

  const legalLinks = [
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
  ];
  const otherLocale = nextLocale(locale);

  return (
    <footer
      ref={footerRef}
      aria-labelledby="footer-close"
      data-scene="inverted"
      data-scene-lock="dark"
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
          <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <nav
          aria-label={t("navLabel")}
          className="mt-(--section-block) grid grid-cols-2 gap-x-6 gap-y-9 border-t border-border-subtle pt-8 lg:grid-cols-5"
        >
          {linkColumns.map(({ title, links }) => (
            <div key={title}>
              <h3 className="eyebrow mb-3.5 text-muted-foreground">{title}</h3>
              <ul>
                {links.map(({ href, label, hint }: { href: string; label: string; hint?: string }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                      {hint && <span className="ms-1.5 text-sm">· {hint}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {socialLinks.length > 0 && (
            <div>
              <h3 className="eyebrow mb-3.5 text-muted-foreground">{t("socialTitle")}</h3>
              <ul>
                {socialLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              <dt className="mt-3 text-xs text-muted-foreground">{t("callLabel")}</dt>
              <dd>
                <Link href={getCommercialCta("technicalCall").href} className={linkClass}>
                  {t("schedule")}
                </Link>
              </dd>
            </dl>
          </div>
        </nav>

        <div className="mt-[clamp(2.25rem,4vw,3.5rem)] flex flex-wrap items-center justify-between gap-x-7 gap-y-3 border-t border-border-subtle py-5 text-md text-muted-foreground">
          <span>{t("copyright", { year: localizedYear })}</span>
          <nav aria-label={t("legalLabel")}>
            <ul className="flex flex-wrap gap-x-5">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={cn(linkClass, "text-md")}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={pathname}
                  locale={otherLocale}
                  hrefLang={otherLocale}
                  lang={otherLocale}
                  className={cn(linkClass, "text-md")}
                >
                  {LOCALE_META[otherLocale].nativeName}
                </Link>
              </li>
            </ul>
          </nav>
          <button
            type="button"
            onClick={() => scrollToY(0)}
            className={cn(linkClass, "cursor-pointer text-md")}
          >
            {t("toTop")}
          </button>
        </div>

        <div
          ref={markRef}
          aria-hidden="true"
          className="overflow-clip pt-[0.04em] pb-[0.05em] text-center leading-[0.74] select-none"
          style={{ fontSize: WORDMARK_FONT_SIZE }}
        >
          <AltruvexWordmark
            data-wordmark
            data-state={markState}
            className="inline-block text-foreground data-[state=armed]:translate-y-[105%] data-[state=in]:translate-y-0 data-[state=in]:transition-transform data-[state=in]:duration-(--motion-display) data-[state=in]:ease-(--ease-strong)"
          />
        </div>
      </Container>
    </footer>
  );
});
