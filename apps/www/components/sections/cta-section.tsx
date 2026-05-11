"use client";

import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

export function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const locale = useLocale();
  const t = useTranslations("commercial.cta");
  const tCTAs = useTranslations("commercial.ctas");
  const callCta = getCommercialCta("technicalCall");

  const eyebrowRef = useReveal({
    ...DEFAULTS.body,
    ease: MOTION.ease.smooth,
    delay: 0,
  });
  const titleRef = useText({ ...DEFAULTS.heading, ease: MOTION.ease.text });
  const contentRef = useReveal({
    ...DEFAULTS.body,
    ease: MOTION.ease.smooth,
    delay: 0.15,
  });

  return (
    <section
      ref={sectionRef}
      id="cta"
      className="relative overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)"
      aria-label={t("sectionAriaLabel")}
    >
      <Container>
        <div className="h-px w-full bg-border mb-16" />
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
          <div className="min-w-0">
            <p
              ref={eyebrowRef}
              className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-6 block"
            >
              {t("eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] max-w-4xl font-normal text-primary"
            >
              {t("title")}
            </h2>
          </div>
          <div ref={contentRef} className="flex min-w-0 flex-col gap-6">
            <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
              {t("nextStepEyebrow")}
            </p>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t("body")}
            </p>
            <MagneticButton size="lg">
              <Link href={callCta.href}>
                <ArrowLabel>{tCTAs("technicalCall")}</ArrowLabel>
              </Link>
            </MagneticButton>
            <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/55 text-center">
              {t("footnote")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
