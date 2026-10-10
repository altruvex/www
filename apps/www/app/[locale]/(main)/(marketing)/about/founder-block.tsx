"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { SITE_CONFIG } from "@/lib/metadata";
import { useLocale, useTranslations } from "next-intl";
import { BUSINESS_REGISTRATION } from "./registration";

// TODO(ali): founder portrait. public/images/trust/founder-closing.jpg is a macro photo of moss,
// not a photo of the founder, so no photo renders. When a real portrait exists, add it here with
// next/image (width/height set) and alt = t("photoAlt", { name, role }).

export function FounderBlockSection() {
  const t = useTranslations("about.founder");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const { founder } = SITE_CONFIG;
  const registry = [
    { key: "registry", value: BUSINESS_REGISTRATION.commercialRegistry },
    { key: "taxId", value: BUSINESS_REGISTRATION.taxId },
  ] as const;
  const filled = registry.filter((r) => r.value);

  return (
    <section aria-labelledby="about-founder-heading" className="pt-(--section-y-top)">
      <Container>
        <SectionHeading
          titleId="about-founder-heading"
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[18ch]" }}
        />

        <div className="mt-(--heading-gap) grid gap-3 border-t border-border-subtle py-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-x-12 md:py-8">
          <h3 className="eyebrow m-0 text-muted-foreground">{t("founderTitle")}</h3>
          <div>
            <p className="m-0 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-foreground">
              {founder.name}, {founder.jobTitle[locale]}
            </p>
            <p className="mt-2 max-w-[60ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {founder.description[locale]}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{t("location")}</p>
          </div>
        </div>

        {filled.length > 0 ? (
          <dl className="m-0 border-t border-b border-border-subtle">
            {filled.map((r) => (
              <div
                key={r.key}
                className="grid gap-1 py-4 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-x-12"
              >
                <dt className="eyebrow text-muted-foreground">{t(r.key)}</dt>
                <dd dir="ltr" className="m-0 text-start tabular-nums">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="border-t border-border-subtle" />
        )}
      </Container>
    </section>
  );
}
