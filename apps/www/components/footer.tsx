"use client";

import { AltruvexLogo } from "@/components/shared/altruvex-logo";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { SITE_CONFIG } from "@/lib/metadata";
import { motion, useReveal } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo } from "react";

export const Footer = memo(function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");
  const locale = useLocale();

  const beat0Ref = useReveal<HTMLDivElement>(motion.fadeUp());
  const beat1Ref = useReveal<HTMLDivElement>(motion.fadeUp({ delay: 0.08 }));
  const beat2Ref = useReveal<HTMLDivElement>(motion.fadeUp({ delay: 0.16 }));

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
      { href: "/how-we-work", label: t("how-we-work") },
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
    <footer className="relative w-full overflow-hidden border-t border-border bg-background">
      <Container className="py-12 md:py-20">
        <div
          ref={beat0Ref}
          className="mb-12 flex flex-col gap-10 lg:mb-20 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="max-w-xs shrink-0 lg:max-w-md">
            <p className="font-sans font-normal leading-relaxed text-foreground text-[clamp(18px,2vw,24px)] tracking-tight">
              {t("tagline")}
            </p>
          </div>
          <nav aria-label="Footer navigation" className="w-full lg:w-auto">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:gap-x-16">
              {linkColumns.map(({ title, links }) => (
                <div key={title}>
                  <h3 className="eyebrow mb-5 text-foreground">
                    {title}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {links.map(({ href, label }) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-sm font-medium leading-snug text-muted-foreground transition-colors duration-200 hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm inline-block"
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
        <div ref={beat1Ref}>
          <div className="relative mb-6 overflow-hidden md:mb-10" aria-hidden="true">
            <div className="select-none font-sans font-bold leading-[0.8] tracking-tighter text-foreground text-[clamp(60px,18vw,400px)] pointer-events-none">
              Altruvex
            </div>
          </div>

          <div className="mb-10 max-w-xl space-y-8 md:mb-16">
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("description")}
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="text-muted-foreground transition-all duration-200 hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t("emailLabel")}: <bdi className="text-foreground">{SITE_CONFIG.email}</bdi>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-all duration-200 hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t("whatsappLabel")}: <bdi className="text-foreground">{SITE_CONFIG.phone}</bdi>
              </a>
            </div>
          </div>
        </div>
        <div
          ref={beat2Ref}
          className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between md:pt-8"
        >
          <div className="order-2 flex items-center gap-3 sm:order-1 opacity-70 transition-opacity hover:opacity-100">
            <AltruvexLogo size="sm" variant="icon" />
            <Eyebrow className="text-[11px]">
              {t("copyright", { year: localizedYear })}
            </Eyebrow>
          </div>
          <nav aria-label="Legal links" className="order-1 sm:order-2">
            <ul className="flex flex-wrap gap-6">
              {legalLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="eyebrow text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
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