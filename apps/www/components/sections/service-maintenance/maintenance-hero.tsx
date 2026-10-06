"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@repo/ui/www";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import type { MaintenanceView } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";


const MONTH_PLAN = "professional";

const OURS = ["uptime", "backups", "updates"] as const;

export function MaintenanceHero({
  plans,
}: {
  plans: readonly MaintenanceView[];
}) {
  const t = useTranslations("serviceDetails.maintenance");
  const tCTAs = useTranslations("commercial.ctas");
  const locale = useLocale();
  const enquiryCta = getCommercialCta("maintenanceEnquiry");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const ctaRef = useSectionElement<HTMLDivElement>();
  const monthEyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const monthTitleRef = useSectionTitle<HTMLHeadingElement>();
  const monthDescRef = useSectionDescription<HTMLParagraphElement>();
  const splitRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-month-part]",
  });

  const plan = plans.find((candidate) => candidate.id === MONTH_PLAN);
  const requests = plan?.requestsPerCycle ?? null;

  return (
    <section
      aria-labelledby="maintenance-hero-heading"
      className="accent-world-green relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="grid gap-8">
          <SectionHeading
            titleAs="h1"
            titleId="maintenance-hero-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("hero.eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            italicWorld
            classes={{
              container: "lg:flex-col lg:items-start",
              titleWrapper: "space-y-6",
              title:
                "max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[1.02] tracking-[-0.035em] rtl:tracking-normal",
            }}
          />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-10">
            <p
              ref={descRef}
              className="max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-relaxed text-muted-foreground"
            >
              {t.rich("description", bodyMarks)}
            </p>
            <div ref={ctaRef} className="lg:justify-self-end">
              <CtaButtonGroup
                primaryVariant="accent"
                primary={{
                  href: "#pricing",
                  label: tCTAs("maintenancePlans"),
                }}
                secondary={{
                  href: enquiryCta.href,
                  label: tCTAs("maintenanceEnquiry"),
                }}
                secondaryArrow
                className="sm:flex-wrap"
              />
            </div>
          </div>
        </div>
        {plan ? (
          <div className="mt-(--section-y-bottom) border-t border-border-subtle pt-(--section-y-top)">
            <SectionHeading
              titleId="maintenance-month-heading"
              eyebrowRef={monthEyebrowRef}
              titleRef={monthTitleRef}
              descriptionRef={monthDescRef}
              eyebrow={t("hero.month.eyebrow")}
              firstTitle={t("hero.month.title")}
              secondTitle={t("hero.month.titleAccent")}
              italicWorld
              description={t("hero.month.description", { plan: plan.name })}
            />

            <div
              ref={splitRef}
              className="mt-(--heading-gap) grid border-t border-border-subtle lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]"
            >
              <div data-month-part className="pt-8 lg:pe-[clamp(2rem,4vw,4rem)]">
                <Eyebrow className="m-0">{t("hero.month.ours.label")}</Eyebrow>
                <h3 className="mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-tight tracking-[-0.02em] text-foreground rtl:leading-[1.4] rtl:tracking-normal">
                  {t("hero.month.ours.heading")}
                </h3>
                <ul className="mt-7 list-none border-t border-border-subtle">
                  {OURS.map((id) => (
                    <li
                      key={id}
                      className="grid gap-1 border-b border-border-subtle py-5 sm:grid-cols-[minmax(7.5rem,11rem)_minmax(0,1fr)] sm:items-baseline sm:gap-8"
                    >
                      <span className="text-base text-local-accent-text">
                        {t(`hero.month.ours.items.${id}.label`)}
                      </span>
                      <span className="text-body leading-normal text-foreground">
                        {t(`hero.month.ours.items.${id}.what`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                data-month-part
                className="mt-12 pt-8 lg:mt-0 lg:border-s lg:border-border-subtle lg:ps-[clamp(2rem,4vw,4rem)]"
              >
                <Eyebrow className="m-0">{t("hero.month.yours.label")}</Eyebrow>
                <h3 className="mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-tight tracking-[-0.02em] text-foreground rtl:leading-[1.4] rtl:tracking-normal">
                  {t("hero.month.yours.heading")}
                </h3>
                {requests !== null ? (
                  <div className="mt-7">
                    <p className="text-balance text-[clamp(1.5rem,2.4vw,2.125rem)] font-light leading-[1.2] tracking-[-0.02em] text-foreground rtl:leading-[1.45] rtl:tracking-normal">
                      {t("hero.month.yours.request")}
                    </p>
                    <div aria-hidden className="mt-4 flex gap-2.5">
                      {Array.from({ length: requests }, (_, index) => (
                        <span
                          key={index}
                          className="size-5 rounded-full border-[1.5px] border-local-accent"
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {t("hero.month.yours.requestNote", {
                        n: localizeNumbers(String(requests), locale),
                      })}
                    </p>
                  </div>
                ) : null}
                <p className="mt-8 max-w-104 text-base leading-relaxed text-muted-foreground">
                  {t("hero.month.yours.quiet")}
                </p>
              </div>
            </div>

            <p className="mt-12 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {t("hero.month.honesty")}
            </p>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
