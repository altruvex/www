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
import { useTranslations } from "next-intl";
import { memo } from "react";

const TIER_KEYS = ["essential", "professional", "flagship"] as const;

/**
 * Extracts the leading price + currency from a localized price range string,
 * e.g. "22,000 – 45,000 EGP" -> "22,000 EGP", "From 180,000 EGP" -> "180,000 EGP",
 * "تبدأ من ١٨٠٬٠٠٠ جنيه" -> "١٨٠٬٠٠٠ جنيه". Locale-safe (Latin + Arabic-Indic).
 */
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

  return (
    <section
      id="pricing-signal"
      className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 md:gap-12 mb-16">
          <div className="space-y-3 max-w-2xl">
            <p
              ref={eyebrowRef}
              className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground m-0"
            >
              {t("eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] font-normal text-foreground m-0"
            >
              {t("title")}
            </h2>
          </div>
          <p
            ref={bodyRef}
            className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground max-w-sm leading-relaxed lg:max-w-[20rem] m-0"
          >
            {t("subtitle")}
          </p>
        </div>
        <div
          ref={gridRef}
          className="grid gap-4 md:grid-cols-3"
        >
          {TIER_KEYS.map((key) => {
            const name = tp(`tiers.${key}.name`);
            const range = tp(`tiers.${key}.priceRange`);
            const features = tp.raw(`tiers.${key}.features`) as string[];
            return (
              <div
                key={key}
                className="pricing-signal-card liquid-glass-panel rounded-xl px-6 py-8 transition-shadow duration-300"
              >
                <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4">
                  {name}
                </p>
                <p className="mb-6">
                  <span className="block font-mono text-xs leading-normal tracking-[0.18em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-1">
                    {t("fromLabel")}
                  </span>
                  <span className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-light tabular-nums text-foreground">
                    {firstPrice(range)}
                  </span>
                </p>
                <ul className="space-y-2">
                  {features.slice(0, 3).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <MagneticButton asChild size="lg" className="group">
            <Link href="/pricing">
              <ArrowLabel>{t("ctaLabel")}</ArrowLabel>
            </Link>
          </MagneticButton>
          <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 max-w-sm">
            {t("footnote")}
          </p>
        </div>
      </Container>
    </section>
  );
});
