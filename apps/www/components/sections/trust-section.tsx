"use client";
import { Container } from "@/components/shared/container";
import { ExternalDirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FOUNDER_LINK } from "@/lib/config/commercial";
import { useSectionCardGrid, useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { useLocale, useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";
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
  const gridRef = useSectionCardGrid({ selector: ".trust-card" });
  const testimonialsRef = useSectionCardGrid<HTMLDivElement>({ selector: ".trust-testimonial", stagger: 0.08 });
  const founderRef = useSectionElement();

  const firstTitle = t("title");
  const secondTitle = t("titleAccent");

  const points = t.raw("points") as Array<{ title: string; body: string }>;

  return (
    <section className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom) border-t border-border">
      <Container>
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="iris"
          description={t.rich("body", bodyMarks)}
          className="mb-16"
        />
        <div className="h-px bg-border mb-5" />
        <div
          ref={gridRef}
          className="grid gap-0 border-t border-l border-r border-border md:grid-cols-3"
        >
          {points.map((point) => (
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
        {testimonials.length > 0 ? (
          <div ref={testimonialsRef} className="mt-10 grid gap-0 border-t border-s border-e border-border md:grid-cols-2">
            {testimonials.map((item) => (
              <figure
                key={item.id}
                className="trust-testimonial border-b border-e border-border px-6 py-8 group hover:bg-surface transition-colors duration-300"
              >
                <blockquote className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-foreground/80">
                  {item.quote[locale]}
                </blockquote>
                <figcaption className="mt-5 eyebrow text-muted-foreground">
                  {item.author} · {item.role[locale]}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        <div ref={founderRef} className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start border-t border-border pt-10">
          <div>
            <Eyebrow className="mb-4">{t("founder.eyebrow")}</Eyebrow>
            <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-medium text-foreground mb-2">
              {t("founder.name")}
            </h3>
            <Eyebrow className="mb-6">{t("founder.role")}</Eyebrow>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-xl">
              {t.rich("founder.body", bodyMarks)}
            </p>
          </div>
          <div className="flex flex-col justify-start">
            <ExternalDirectionalLink
              href={FOUNDER_LINK}
              className="eyebrow inline-flex text-foreground transition-colors hover:text-muted-foreground"
            >
              {t("founder.linkLabel")}
            </ExternalDirectionalLink>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-9">
          <Eyebrow>{tW("labels.integrity")}</Eyebrow>
          <div className="flex-1 h-px bg-border" />
        </div>
      </Container>
    </section>
  );
});
