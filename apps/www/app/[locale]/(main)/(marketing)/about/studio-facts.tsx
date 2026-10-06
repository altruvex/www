"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { getCommercialCta } from "@/lib/config/commercial";
import { useSectionCardGrid, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";

type FactKey =
  | "what"
  | "shipped"
  | "languages"
  | "build"
  | "process"
  | "pricing"
  | "where"
  | "name";

type Fact = {
  key: FactKey;
  link?:
    | { href: string; cta: "exploreServices" | "scopeProjects" | "realBuild" }
    | { href: string; label: "standardsLink" | "processLink" };
};

const LINK_CLASS =
  "mt-3 text-base text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current";

/** Nine rows is the ceiling: the terms do the scanning, so no bold inside the list. */
const FACTS: readonly Fact[] = [
  { key: "what", link: { href: getCommercialCta("exploreServices").href, cta: "exploreServices" } },
  { key: "shipped", link: { href: getCommercialCta("realBuild").href, cta: "realBuild" } },
  { key: "languages" },
  { key: "build", link: { href: "/standards", label: "standardsLink" } },
  { key: "process", link: { href: "/process", label: "processLink" } },
  { key: "pricing", link: { href: getCommercialCta("scopeProjects").href, cta: "scopeProjects" } },
  { key: "where" },
  { key: "name" },
];

export function StudioFactsSection() {
  const t = useTranslations("about.facts");
  const tCta = useTranslations("commercial.ctas");

  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const listRef = useSectionCardGrid<HTMLDListElement>({ selector: "[data-fact-row]" });

  return (
    <section
      aria-labelledby="about-facts-heading"
      className="pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleId="about-facts-heading"
          titleRef={titleRef}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[18ch]" }}
        />

        <dl ref={listRef} className="mt-(--heading-gap) border-b border-border-subtle">
          {FACTS.map((fact) => (
            <div
              key={fact.key}
              data-fact-row
              className="grid gap-3 border-t border-border-subtle py-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-x-12 md:py-8"
            >
              <dt className="eyebrow text-muted-foreground">{t(`items.${fact.key}.term`)}</dt>
              <dd className="m-0">
                <p className="max-w-[60ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-foreground">
                  {t(`items.${fact.key}.value`)}
                </p>
                {fact.link ? (
                  <DirectionalLink href={fact.link.href} className={LINK_CLASS}>
                    {"cta" in fact.link ? tCta(fact.link.cta) : t(fact.link.label)}
                  </DirectionalLink>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
