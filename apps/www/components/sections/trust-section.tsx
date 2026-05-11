"use client";

import { Container } from "@/components/container";
import { ExternalDirectionalLink } from "@/components/directional-link";
import { FOUNDER_LINK } from "@/lib/commercial";
import { DEFAULTS, MOTION, useBatch, useReveal, useText } from "@/lib/motion";
import { splitHeadline } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

export const TrustSection = memo(function TrustSection() {
  const locale = useLocale();
  const t = useTranslations("commercial.trust");
  const tW = useTranslations("work");
  const tCommon = useTranslations("common");
  const stepLabel = tCommon("step");

  const eyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const titleRef = useText<HTMLHeadingElement>({
    ...DEFAULTS.heading,
    ease: MOTION.ease.text,
  });
  const bodyRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });
  const gridRef = useBatch({ ...DEFAULTS.card, selector: ".trust-card" });

  const title = t("title");
  const { first: firstTitle, second: secondTitle } = splitHeadline(title);

  const points = t.raw("points") as Array<{ title: string; body: string }>;

  return (
    <section className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-border">
      <Container>
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 md:gap-12 mb-16">
          <div className="space-y-3">
            <p
              ref={eyebrowRef}
              className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground m-0"
            >
              {t("eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] font-normal text-foreground m-0"
            >
              {firstTitle}
              {secondTitle ? (
                <>
                  <br className="hidden md:block" />
                  <span className="block mt-2 md:mt-0 md:inline font-serif italic font-light text-foreground/45 rtl:font-sans rtl:not-italic rtl:font-bold">
                    {secondTitle}
                  </span>
                </>
              ) : null}
            </h2>
          </div>
          <p
            ref={bodyRef}
            className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground max-w-sm leading-relaxed md:max-w-xs lg:max-w-[20rem] m-0"
          >
            {t("body")}
          </p>
        </div>
        <div className="h-px bg-border mb-5" />
        <div
          ref={gridRef}
          className="grid gap-0 border-t border-l border-r border-border md:grid-cols-3"
        >
          {points.map((point, i) => (
            <div
              key={point.title}
              className="trust-card border-r border-b border-border px-6 py-8 group hover:bg-surface transition-colors duration-300"
            >
              <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] font-medium text-foreground mb-3 tracking-tight">
                {point.title}
              </h3>
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground leading-relaxed">
                {point.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start border-t border-border pt-10">
          <div>
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4">
              {t("founder.eyebrow")}
            </p>
            <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-medium text-foreground mb-2">
              {t("founder.name")}
            </h3>
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-6">
              {t("founder.role")}
            </p>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-xl">
              {t("founder.body")}
            </p>
          </div>
          <div className="flex flex-col justify-start">
            <ExternalDirectionalLink
              href={FOUNDER_LINK}
              className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal inline-flex text-foreground transition-colors hover:text-muted-foreground"
            >
              {t("founder.linkLabel")}
            </ExternalDirectionalLink>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-9">
          <span className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
            {tW("labels.integrity")}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </Container>
    </section>
  );
});
