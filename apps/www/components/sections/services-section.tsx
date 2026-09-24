"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

type ServiceKey = "service1" | "service3" | "service4";

// E-commerce (service2) was removed with its service page on 2026-09-13; the
// remaining keys keep their names so the copy files did not have to be renamed.
const SERVICES: readonly ServiceKey[] = ["service1", "service3", "service4"];

/**
 * The group label every register on the homepage uses (trust, ownership,
 * work): eyebrow, count, then a hairline that runs to the edge.
 */
function RegisterDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-4">
      <Eyebrow className="m-0">{label}</Eyebrow>
      <span className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
        <Num value={count} pad={2} />
      </span>
      <div aria-hidden className="h-px flex-1 bg-border-subtle/60" />
    </div>
  );
}

const ServiceEntry = memo(function ServiceEntry({
  serviceKey,
  index,
}: {
  serviceKey: ServiceKey;
  index: number;
}) {
  const t = useTranslations("services");

  return (
    <li data-register-row className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="shrink-0 text-sm tabular-nums text-muted-foreground ltr:font-mono"
        >
          <Num value={index + 1} pad={2} />
        </span>
        <Eyebrow className="m-0">{t(`${serviceKey}.tag`)}</Eyebrow>
      </div>
      <h3 className="mt-4 text-[clamp(1.375rem,1.7vw,1.75rem)] font-medium leading-snug text-foreground">
        {t(`${serviceKey}.title`)}
      </h3>
      <p className="mt-3 max-w-[60ch] text-[clamp(0.9375rem,1vw,1.0625rem)] leading-relaxed text-muted-foreground">
        {t.rich(`${serviceKey}.description`, bodyMarks)}
      </p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-6">
        {(["badge1", "badge2"] as const).map((badge) => (
          <li
            key={badge}
            dir="auto"
            className="rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-micro leading-normal tracking-[0.06em] text-muted-foreground ltr:font-mono"
          >
            {t(`${serviceKey}.${badge}`)}
          </li>
        ))}
      </ul>
    </li>
  );
});

/**
 * "Three disciplines. One delivery standard." as two registers: what varies,
 * set in three columns, and what never varies, written once beneath them.
 * The standard's wording is read from `servicesPage.chapters.plate`, the list
 * /services prints, so the two pages cannot promise different things.
 */
export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services");
  const tStandard = useTranslations("servicesPage.chapters.plate");
  const standard: string[] = tStandard.raw("items");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const registerRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-register-row]",
  });

  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="services-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t("subtitle")}
          className="mb-14 md:mb-20"
        />

        <div ref={registerRef}>
          <RegisterDivider
            label={t("disciplines.label")}
            count={SERVICES.length}
          />

          <ol className="mt-10 grid list-none gap-y-12 md:mt-12 md:grid-cols-3 md:gap-x-10 lg:gap-x-12">
            {SERVICES.map((serviceKey, index) => (
              <ServiceEntry
                key={serviceKey}
                serviceKey={serviceKey}
                index={index}
              />
            ))}
          </ol>

          <div className="mt-16 md:mt-20">
            <RegisterDivider
              label={t("standard.label")}
              count={standard.length}
            />
          </div>

          <ol className="mt-10 grid list-none gap-x-10 gap-y-8 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-x-12">
            {standard.map((item, index) => (
              <li
                key={item}
                data-register-row
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] lg:grid-cols-1 lg:gap-y-3"
              >
                <span
                  aria-hidden
                  className="pt-0.5 text-sm tabular-nums text-muted-foreground ltr:font-mono"
                >
                  <Num value={index + 1} pad={2} />
                </span>
                <p className="text-[clamp(0.9375rem,1vw,1.0625rem)] leading-relaxed text-foreground">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 md:mt-16">
          <Link
            href="/services"
            className="inline-flex min-h-6 items-center gap-2 text-[0.9375rem] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
          >
            {t("explore")}
            <span aria-hidden className="rtl:-scale-x-100">
              →
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
});
