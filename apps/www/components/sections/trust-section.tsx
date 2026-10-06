"use client";

import { Container } from "@/components/shared/container";
import {
  DirectionalLink,
  ExternalDirectionalLink,
} from "@/components/shared/directional-link";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  FOUNDER_LINK,
  getCommercialCta,
  type CommercialCtaKey,
} from "@/lib/config/commercial";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { memo, useEffect, useRef } from "react";
import { SectionHeading } from "./section-heading";

const CHECKS: ReadonlyArray<{ id: string; cta: CommercialCtaKey }> = [
  { id: "price", cta: "projectRange" },
  { id: "standard", cta: "viewStandards" },
  { id: "terms", cta: "paymentTerms" },
  { id: "work", cta: "realBuild" },
];

const closingMarks = {
  dim: (chunks: ReactNode) => <span className="text-white/65">{chunks}</span>,
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-white">{chunks}</strong>
  ),
} as const;

export const TrustSection = memo(function TrustSection() {
  const t = useTranslations("commercial.trust");
  const tCTAs = useTranslations("commercial.ctas");
  const fillTokens = useFillPricingTokens();

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();

  const checksRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-check-row]",
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
        <div ref={checksRef}>
          <div className="flex items-baseline gap-4">
            <Eyebrow role="heading" aria-level={3} className="m-0">
              {t("checks.label")}
            </Eyebrow>
            <span className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
              <Num value={CHECKS.length} pad={2} />
            </span>
            <div aria-hidden className="h-px flex-1 bg-border-subtle/60" />
          </div>
          <ol className="mt-10 grid list-none gap-x-10 gap-y-10 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-x-12">
            {CHECKS.map(({ id, cta }) => (
              <li
                key={id}
                data-check-row
              >
                <div>
                  <h4 className="text-body font-normal leading-snug text-foreground">
                    {t(`checks.items.${id}.title`)}
                  </h4>
                  <p className="mt-2 text-[clamp(0.9375rem,1vw,1.0625rem)] leading-relaxed text-muted-foreground">
                    {fillTokens(t.raw(`checks.items.${id}.body`) as string)}
                  </p>
                  <DirectionalLink
                    href={getCommercialCta(cta).href}
                    className="mt-3 inline-flex min-h-6 items-center text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
                  >
                    {tCTAs(cta)}
                  </DirectionalLink>
                </div>
              </li>
            ))}
          </ol>
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
              {t("founder.label")}
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
