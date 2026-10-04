"use client";

import { Container } from "@/components/shared/container";
import {
  DirectionalLink,
  ExternalDirectionalLink,
} from "@/components/shared/directional-link";
import { bodyMarks } from "@/components/ui/rich-text";
import { FOUNDER_LINK } from "@/lib/config/commercial";
import { getAllTestimonials } from "@/lib/data/testimonials";
import {
  MOTION,
  splitWords,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
  useWordRead,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { memo, useEffect, useRef } from "react";
import { SectionHeading } from "./section-heading";

const QUOTE_ROW =
  "grid gap-x-12 gap-y-8 py-12 md:py-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]";

const closingMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-white">{chunks}</strong>
  ),
  dim: (chunks: ReactNode) => <span className="text-white/55">{chunks}</span>,
} as const;

function ClientQuote({ text }: { text: string }) {
  const readRef = useWordRead<HTMLQuoteElement>();
  return (
    <blockquote
      ref={readRef}
      className="max-w-[26ch] text-[clamp(1.5rem,3vw,2.875rem)] leading-[1.16] font-light tracking-[-0.028em] text-foreground rtl:leading-[1.45] rtl:tracking-normal"
    >
      {splitWords(text).map(({ key, word }) => (
        <span key={key} data-word>
          {word}
        </span>
      ))}
    </blockquote>
  );
}

export const TrustSection = memo(function TrustSection() {
  const t = useTranslations("commercial.trust");
  const tW = useTranslations("work");
  const locale = useLocale() as "en" | "ar";
  const testimonials = getAllTestimonials();

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();

  const registerRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-ledger-row]",
  });


  const closingFrameRef = useRef<HTMLDivElement>(null);
  const closingMediaRef = useRef<HTMLDivElement>(null);
  const closingImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const frame = closingFrameRef.current;
    const media = closingMediaRef.current;
    const image = closingImageRef.current;
    if (!frame || !media || !image) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set(frame, { paddingLeft: 0, paddingRight: 0 });
            gsap.set(media, { borderRadius: 0 });
            gsap.set(image, { scale: 1 });
            return;
          }

          gsap.set(image, { scale: 1.12 });
          const timeline = gsap.timeline({
            defaults: { ease: MOTION.ease.gentle },
            scrollTrigger: {
              trigger: frame,
              start: MOTION.trigger.early,
              end: "top 25%",
              scrub: MOTION.scroll.scrub.pin,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to(frame, { paddingLeft: 0, paddingRight: 0, duration: 1 }, 0)
            .to(media, { borderRadius: 0, duration: 1 }, 0)
            .to(image, { scale: 1, duration: 1 }, 0);

          return () => {
            ScrollTrigger.refresh();
          };
        },
      );
    }, frame);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-labelledby="trust-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
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
          className="mb-(--heading-gap)"
        />
        <div ref={registerRef} className="border-t-2 border-foreground">
          <h3 className="sr-only">{t("testimonials.eyebrow")}</h3>
          {testimonials.map((item) => (
            <figure
              key={item.id}
              data-ledger-row
              className={cn(QUOTE_ROW, "border-b border-border-subtle")}
            >
              <figcaption className="order-2 flex flex-col items-start gap-1 text-sm lg:order-1">
                <span className="text-[1.375rem] leading-snug text-foreground">
                  {item.author}
                </span>
                <span className="text-muted-foreground">
                  {item.role[locale]}
                </span>
                {item.caseStudySlug ? (
                  <DirectionalLink
                    href={`/work/${item.caseStudySlug}`}
                    ariaLabel={tW("labels.readCaseStudyWith", {
                      name: item.author,
                    })}
                    className="mt-3 inline-flex min-h-6 items-center text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
                  >
                    {tW("labels.viewCaseStudy")}
                  </DirectionalLink>
                ) : null}
              </figcaption>
              <div className="order-1 lg:order-2">
                <ClientQuote text={item.quote[locale]} />
              </div>
            </figure>
          ))}
        </div>
      </Container>
      <div
        ref={closingFrameRef}
        className="mt-(--section-block) px-6 sm:px-8 md:px-12 lg:px-16"
      >
        <div
          ref={closingMediaRef}
          className="relative h-104 w-full overflow-hidden rounded-panel-lg sm:h-120 md:h-136 lg:h-152"
        >
          <Image
            ref={closingImageRef}
            src="/images/trust/founder-closing.jpg"
            alt=""
            aria-hidden
            fill
            quality={75}
            draggable={false}
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10"
          />
          <figure className="absolute inset-x-0 bottom-0 p-8 sm:p-12 md:p-16 lg:p-20">
            <p className="eyebrow mb-5 text-white/80">
              {tW("labels.integrity")}
            </p>
            <blockquote className="max-w-[46ch] text-[clamp(1.375rem,3.2vw,2.25rem)] font-medium leading-tight tracking-tight text-balance text-white">
              {t.rich("founder.body", closingMarks)}
            </blockquote>
            <figcaption className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium text-white">
                {t("founder.name")}
              </span>
              <span className="text-white/60">· {t("founder.role")}</span>
              <ExternalDirectionalLink
                href={FOUNDER_LINK}
                className="inline-flex min-h-6 items-center text-white/60 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/70 pointer-coarse:min-h-11"
              >
                {t("founder.linkLabel")}
              </ExternalDirectionalLink>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
});
