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
      { href: "/faq", label: t("faq") },
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
      className="relative w-full overflow-hidden border-t border-foreground/8"
    >
      <Container className="py-10 sm:py-12 md:py-16">
        <div
          data-reveal
          data-beat="0"
          className="mb-10 flex flex-col gap-8 sm:mb-12 md:mb-16 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="max-w-xs shrink-0 lg:max-w-sm">
            <p className="font-sans font-normal leading-[1.5] text-primary/88 ltr:tracking-tight rtl:tracking-normal text-[clamp(15px,2.5vw,20px)]">
              {t("tagline")}
            </p>
          </div>
          <nav aria-label="Footer navigation" className="w-full lg:w-auto">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 md:gap-x-12">
              {linkColumns.map(({ title, links }) => (
                <div key={title}>
                  <h3 className="mb-3 font-mono text-sm leading-normal text-primary/70 ltr:uppercase ltr:tracking-wider rtl:tracking-normal lg:text-base">
                    {title}
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {links.map(({ href, label }) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-xs leading-snug text-primary/70 transition-colors duration-200 hover:text-primary hover:underline underline-offset-4 ltr:tracking-wider rtl:tracking-normal lg:text-sm"
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
          <div className="relative mb-6 overflow-hidden md:mb-8">
            <h2 className="select-none font-sans font-semibold leading-[0.84] text-primary text-[clamp(56px,17vw,380px)]">
              <span className="block overflow-hidden">
                <span data-heading-line data-motion-accent className="block">
                  Altruvex
                </span>
              </span>
            </h2>
          </div>
          <div className="mb-10 max-w-xl space-y-8 md:mb-14">
            <p className="text-[13px] leading-relaxed text-primary/75 sm:text-[14px] md:text-[15px]">
              {t("description")}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="rounded-sm text-primary/70 underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("emailLabel")}: <bdi>{SITE_CONFIG.email}</bdi>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm text-primary/70 underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("whatsappLabel")}: <bdi>{SITE_CONFIG.phone}</bdi>
              </a>
            </div>
          </div>
        </div>

        <div
          data-reveal
          data-beat="2"
          className="flex flex-col gap-3 border-t border-foreground/8 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6 md:pt-8"
        >
          <div className="order-2 flex items-center gap-2 sm:order-1">
            <AltruvexLogo size="sm" variant="icon" />
            <span className="font-mono text-[13px] leading-normal text-primary/70 ltr:uppercase ltr:tracking-widest rtl:tracking-normal">
              {t("copyright", { year: localizedYear })}
            </span>
          </div>
          <nav aria-label="Legal links" className="order-1 sm:order-2">
            <ul className="flex flex-wrap gap-4 sm:gap-8">
              {legalLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="font-mono text-sm leading-normal text-primary/70 transition-colors duration-200 hover:text-primary hover:underline underline-offset-4 ltr:uppercase ltr:tracking-widest rtl:tracking-normal"
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