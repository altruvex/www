"use client";

import { Container } from "@/components/shared/container";
import { ExternalDirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { FOUNDER_LINK } from "@/lib/config/commercial";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

export const TrustSection = memo(function TrustSection() {
  const t = useTranslations("commercial.trust");
  const tW = useTranslations("work");
  const locale = useLocale() as "en" | "ar";
  const testimonials = getAllTestimonials();

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();

  const pointsRef = useSectionCardGrid<HTMLDivElement>({
    selector: ".trust-point",
  });

  const testimonialsRef = useSectionCardGrid<HTMLDivElement>({
    selector: ".trust-testimonial",
    stagger: 0.08,
  });

  const founderRef = useSectionElement();

  const points = t.raw("points") as Array<{
    title: string;
    body: string;
  }>;

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
          description={t.rich("body", bodyMarks)}
          className="mb-16"
        />
        <div
          ref={pointsRef}
          className="border-t border-border"
        >
          {points.map((point) => (
            <article
              key={point.title}
              className="trust-point flex items-center justify-between gap-6 border-b border-border py-8 md:gap-x-12 md:py-10"
            >
              <div className="flex items-center gap-4">
                <h3 className="max-w-md text-[clamp(1.35rem,2vw,1.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-foreground">
                  {point.title}
                </h3>
              </div>
              <div className="flex gap-4 md:gap-10">
                <p className="max-w-[68ch] text-[clamp(1rem,1.02vw,1.125rem)] leading-[1.7] text-muted-foreground">
                  {point.body}
                </p>
              </div>
            </article>
          ))}
        </div>
        {testimonials.length > 0 ? (
          <div
            ref={testimonialsRef}
            className="mt-20 border-t border-border md:mt-24"
          >
            <div className="flex items-end justify-between gap-8 border-b border-border py-6">
              <Eyebrow>{t("testimonials.eyebrow")}</Eyebrow>
              <span className="hidden text-sm text-muted-foreground md:block">
                {String(testimonials.length).padStart(2, "0")}
              </span>
            </div>
            <div className="grid md:grid-cols-2">
              {testimonials.map((item, index) => (
                <figure
                  key={item.id}
                  className="trust-testimonial group border-b border-border py-9 md:px-8 md:py-10"
                  style={{
                    paddingLeft: index % 2 === 0 ? undefined : undefined,
                  }}
                >
                  <blockquote className="max-w-120 text-[clamp(1.25rem,1.8vw,1.7rem)] leading-[1.45] tracking-[-0.015em] text-foreground/90">
                    “{item.quote[locale]}”
                  </blockquote>
                  <figcaption className="mt-8">
                    <div className="text-sm font-medium text-foreground">
                      {item.author}
                    </div>
                    <Eyebrow className="mt-1 text-muted-foreground">
                      {item.role[locale]}
                    </Eyebrow>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : null}
        <div
          ref={founderRef}
          className="mt-20 border-t border-border pt-10 md:mt-24 md:pt-12"
        >
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] md:gap-16">
            <div>
              <Eyebrow>{t("founder.eyebrow")}</Eyebrow>
            </div>
            <div>
              <p className="max-w-[48ch] text-[clamp(1.35rem,2vw,1.75rem)] leading-[1.45] tracking-[-0.015em] text-foreground">
                {t.rich("founder.body", bodyMarks)}
              </p>
              <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t("founder.name")}
                </span>
                <Eyebrow className="text-muted-foreground">
                  {t("founder.role")}
                </Eyebrow>
                <ExternalDirectionalLink
                  href={FOUNDER_LINK}
                  className="ml-auto inline-flex min-h-6 items-center text-sm text-foreground transition-colors hover:text-muted-foreground pointer-coarse:min-h-11"
                >
                  {t("founder.linkLabel")}
                </ExternalDirectionalLink>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex items-center gap-4">
          <Eyebrow>{tW("labels.integrity")}</Eyebrow>
          <div className="h-px flex-1 bg-border" />
        </div>
      </Container>
    </section>
  );
});