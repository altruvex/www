"use client";

import { Container } from "@/components/shared/container";
import {
  DirectionalLink,
  ExternalDirectionalLink,
} from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import { FOUNDER_LINK } from "@/lib/config/commercial";
import { getAllTestimonials } from "@/lib/data/testimonials";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

const MOVEMENT_GAP = "mt-16 md:mt-20";

export const TrustSection = memo(function TrustSection() {
  const t = useTranslations("commercial.trust");
  const tW = useTranslations("work");
  const locale = useLocale() as "en" | "ar";
  const testimonials = getAllTestimonials();

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();

  // 01 — Proof strip: same data source (t.raw("points")), new treatment.
  // Dense, side-by-side, scannable in <2s — not a paragraph list.
  const proofRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-proof-item]",
  });

  const founderRef = useSectionElement<HTMLDivElement>();

  const testimonialsRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-trust-testimonial]",
  });

  const points = t.raw("points") as Array<{ title: string; body: string }>;

  return (
    <section
      aria-labelledby="trust-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="trust-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="world"
          description={t.rich("body", bodyMarks)}
          className="mb-14 md:mb-20"
        />
        <div ref={proofRef} className="relative pl-14 md:pl-16">
          <div
            aria-hidden
            className="absolute top-5 bottom-5 left-6 w-px bg-border md:left-7"
          />
          <ol className="list-none space-y-14 md:space-y-16">
            {points.map((point, index) => (
              <li key={point.title} data-proof-item className="relative">
                <span
                  aria-hidden
                  className="absolute top-0.5 -left-14 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-background font-mono text-base tabular-nums text-foreground md:-left-14 md:h-12 md:w-12 md:text-md"
                >
                  <Num value={index + 1} pad={2} />
                </span>
                <h3 className="text-[clamp(2.25rem,2.3vw,2.75rem)] font-medium leading-snug text-foreground">
                  {point.title}
                </h3>
                <p className="mt-3 max-w-[52ch] text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div
          ref={founderRef}
          className={cn(
            MOVEMENT_GAP,
            "border-t border-border pt-16 md:pt-20"
          )}
        >
          <Eyebrow tone="accent">{t("founder.eyebrow")}</Eyebrow>
          <p className="mt-6 max-w-[42ch] text-[clamp(1.75rem,3.4vw,2.75rem)] font-medium leading-[1.15] tracking-tight text-balance text-foreground">
            {t.rich("founder.body", bodyMarks)}
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium text-foreground"
            >
              {t("founder.name").charAt(0)}
            </div>
            <div>
              <p className="text-sm">
                <span className="font-medium text-foreground">
                  {t("founder.name")}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {t("founder.role")}
                </span>
              </p>
              <ExternalDirectionalLink
                href={FOUNDER_LINK}
                className="mt-1 inline-flex min-h-6 items-center text-sm text-muted-foreground transition-colors hover:text-local-accent-text pointer-coarse:min-h-11"
              >
                {t("founder.linkLabel")}
              </ExternalDirectionalLink>
            </div>
          </div>
        </div>
        {testimonials.length > 0 ? (
          <div className={MOVEMENT_GAP}>
            <div className="flex items-baseline gap-4">
              <Eyebrow>{t("testimonials.eyebrow")}</Eyebrow>
              <span className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
                <Num value={testimonials.length} pad={2} />
              </span>
            </div>
            <div
              ref={testimonialsRef}
              className="mt-8 grid gap-6 md:mt-10 md:grid-cols-2"
            >
              {testimonials.map((item) => (
                <figure
                  key={item.id}
                  data-trust-testimonial
                  className="rounded-lg border border-border bg-background p-6 md:p-8"
                >
                  <blockquote className="text-[clamp(1rem,1.15vw,1.125rem)] leading-relaxed text-foreground/85">
                    {item.quote[locale]}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-foreground"
                    >
                      {item.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium text-foreground">
                          {item.author}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.role[locale]}
                        </span>
                      </p>
                      {item.caseStudySlug ? (
                        <DirectionalLink
                          href={`/work/${item.caseStudySlug}`}
                          ariaLabel={tW("labels.readCaseStudyWith", {
                            name: item.author,
                          })}
                          className="inline-flex min-h-6 items-center text-sm text-muted-foreground transition-colors hover:text-local-accent-text pointer-coarse:min-h-11"
                        >
                          {tW("labels.viewCaseStudy")}
                        </DirectionalLink>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex items-center gap-4 md:mt-12">
          <Eyebrow>{tW("labels.integrity")}</Eyebrow>
          <div aria-hidden className="h-px flex-1 bg-border/60" />
        </div>
      </Container>
    </section>
  );
});