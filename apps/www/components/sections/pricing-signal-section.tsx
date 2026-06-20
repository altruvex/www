"use client";
import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

const TIER_KEYS = ["essential", "professional", "flagship"] as const;

function firstPrice(range: string): string {
  const currency = (range.match(/[A-Za-z؀-ۿ.]+\s*$/) ?? [""])[0].trim();
  const num = (
    range.match(/[\d٠-٩][\d٠-٩.,٫٬]*/) ?? [""]
  )[0];
  return [num, currency].filter(Boolean).join(" ");
}

export const PricingSignalSection = memo(function PricingSignalSection() {
  const t = useTranslations("pricingSignal");
  const tp = useTranslations("pricing");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const gridRef = useSectionCardGrid({ selector: ".pricing-signal-card" });

  const title = t("title");
  const { first: firstTitle, second: secondTitle } = splitHeadline(title);

  return (
    <section
      id="pricing-signal"
      className="accent-world-orange border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="iris"
          description={t("subtitle")}
          className="mb-16"
        />
        <div
          ref={gridRef}
          className="grid gap-0 border-t border-s border-e border-border md:grid-cols-3"
        >
          {TIER_KEYS.map((key) => {
            const name = tp(`tiers.${key}.name`);
            const range = tp(`tiers.${key}.priceRange`);
            const features = tp.raw(`tiers.${key}.features`) as string[];
            const featured = key === "professional";
            return (
              <div
                key={key}
                className={cn(
                  "pricing-signal-card relative border-e border-b border-border px-6 py-8 group transition-colors duration-300",
                  featured ? "bg-brand/3 hover:bg-brand/6" : "hover:bg-surface",
                )}
              >
                {featured ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 bg-brand"
                  />
                ) : null}
                <p
                  className={cn(
                    "eyebrow mb-4",
                    featured ? "text-brand-text" : "text-muted-foreground",
                  )}
                >
                  {name}
                </p>
                <p className="mb-6">
                  <span className="block eyebrow text-muted-foreground/70 mb-1">
                    {t("fromLabel")}
                  </span>
                  <span className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-medium tabular-nums text-foreground">
                    {firstPrice(range)}
                  </span>
                </p>
                <ul className="space-y-3">
                  {features.slice(0, 3).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-2.5 h-1 w-1 shrink-0 rounded-full transition-colors",
                          featured
                            ? "bg-brand"
                            : "bg-foreground/40 group-hover:bg-foreground",
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start border-t border-border pt-10">
          <div className="flex flex-col items-start gap-6">
            <MagneticButton asChild size="lg" className="group">
              <Link href="/pricing">
                <ArrowLabel>{t("ctaLabel")}</ArrowLabel>
              </Link>
            </MagneticButton>
          </div>
          <div className="flex flex-col justify-start">
            <p className="eyebrow text-muted-foreground/70">
              {t("footnote")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
});