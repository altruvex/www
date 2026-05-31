"use client";

import { Link } from "@/i18n/navigation";
import { SITE_CONFIG } from "@/lib/metadata";
import { localizeNumbers } from "@/lib/number";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { AltruvexLogo } from "./altruvex-logo";
import { Container } from "./container";

export const Footer = memo(function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");
  const locale = useLocale();

  const localizedYear = useMemo(() => {
    const year = new Date().getFullYear();
    return locale === "ar"
      ? localizeNumbers(year.toString(), locale)
      : year.toString();
  }, [locale]);

  const servicesLinks = useMemo(
    () => [
      { href: "/services/interface-design", label: t("webDesign") },
      { href: "/services/development", label: t("development") },
      { href: "/services/consulting", label: t("consulting") },
      { href: "/services/maintenance", label: t("maintenance") },
      { href: "/services/ecommerce", label: t("ecommerce") },
    ],
    [t],
  );

  const companyLinks = useMemo(
    () => [
      { href: "/approach", label: t("approach") },
      { href: "/work", label: t("work") },
      { href: "/process", label: t("process") },
      { href: "/standards", label: t("standards") },
    ],
    [t],
  );

  const resourceLinks = useMemo(
    () => [
      { href: "/pricing", label: t("pricing") },
      { href: "/writing", label: t("writing") },
      { href: "/schedule", label: t("schedule") },
      { href: "/contact", label: t("contact") },
    ],
    [t],
  );

  const legalLinks = useMemo(
    () => [
      { href: "/privacy", label: t("privacy") },
      { href: "/terms", label: t("terms") },
      { href: "/about", label: navT("about") },
    ],
    [t, navT],
  );

  const linkColumns = [
    { title: t("servicesTitle"), links: servicesLinks },
    { title: t("companyTitle"), links: companyLinks },
    { title: t("resourcesTitle"), links: resourceLinks },
  ];

  const whatsappUrl = getWhatsAppUrl();

  return (
    <footer
      data-animate-section
      className="relative overflow-hidden w-full border-t border-foreground/8"
    >
      <Container className="py-10 sm:py-12 md:py-16">
        <div
          data-reveal
          data-beat="0"
          className="mb-10 sm:mb-12 md:mb-16 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="max-w-xs shrink-0 lg:max-w-sm">
            <p
              className="font-sans font-normal text-primary/88"
              style={{
                fontSize: "clamp(15px, 2.5vw, 20px)",
                letterSpacing: "-0.015em",
                lineHeight: 1.5,
              }}
            >
              {t("tagline")}
            </p>
          </div>
          <nav aria-label="Footer navigation" className="w-full lg:w-auto">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 md:gap-x-12">
              {linkColumns.map(({ title, links }) => (
                <div key={title}>
                  <h3 className="font-mono text-sm leading-normal tracking-wider lg:text-base uppercase text-primary/70 mb-3">
                    {title}
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {links.map(({ href, label }) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-xs tracking-wider lg:text-sm text-primary/70 transition-colors duration-200 hover:text-primary leading-snug hover:underline"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>
        <div data-reveal data-beat="1">
          <div className="relative mb-6 md:mb-8 overflow-hidden">
            <h2
              className="select-none font-sans font-semibold text-primary"
              style={{
                fontSize: "clamp(56px, 17vw, 380px)",
                lineHeight: "0.84",
              }}
            >
              <span className="block overflow-hidden">
                <span data-heading-line data-motion-accent className="block">
                  Altruvex
                </span>
              </span>
            </h2>
          </div>
          <div className="mb-10 md:mb-14 max-w-xl space-y-8">
            <p className="text-[13px] sm:text-[14px] md:text-[15px] text-primary/75 leading-relaxed">
              {t("description")}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="text-primary/70 hover:text-primary underline underline-offset-4 decoration-border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t("emailLabel")}: {SITE_CONFIG.email}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/70 hover:text-primary underline underline-offset-4 decoration-border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t("whatsappLabel")}: {SITE_CONFIG.phone}
              </a>
            </div>
          </div>
        </div>
        <div
          data-reveal
          data-beat="2"
          className="border-t border-foreground/8 pt-5 sm:pt-6 md:pt-8 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
        >
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <AltruvexLogo size="sm" variant="icon" />
            <span className="font-mono leading-normal text-[13px] text-primary/70 uppercase tracking-widest">
              {t("copyright", { year: localizedYear })}
            </span>
          </div>
          <nav aria-label="Legal links" className="order-1 sm:order-2">
            <ul className="flex flex-wrap gap-4 sm:gap-8">
              {legalLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="font-mono text-[13px] leading-normal tracking-widest ltr:uppercase text-primary/70 transition-colors duration-200 hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
});
