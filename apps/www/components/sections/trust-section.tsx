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
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { memo, useEffect, useRef } from "react";
import { SectionHeading } from "./section-heading";

const SHEET_ROW =
  "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-6 md:grid-cols-[3.5rem_minmax(0,1fr)] lg:grid-cols-[3.5rem_minmax(0,4fr)_minmax(0,6fr)_11rem] lg:items-baseline lg:gap-x-12";

const closingMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-white">{chunks}</strong>
  ),
  dim: (chunks: ReactNode) => <span className="text-white/55">{chunks}</span>,
} as const;

function RegisterDivider({ label }: { label: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <Eyebrow className="m-0">{label}</Eyebrow>
      <div aria-hidden className="h-px flex-1 bg-border-subtle/60" />
    </div>
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

  const stages = t.raw("stages") as Array<{ title: string; body: string }>;
  const founderName = t("founder.name");

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
          accent="world"
          description={t.rich("body", bodyMarks)}
          className="mb-14 md:mb-20"
        />
        <div ref={registerRef} className="border-t-2 border-foreground">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border-subtle py-4">
            <h3 className="eyebrow m-0 text-foreground">
              {t("sheet.eyebrow")}
            </h3>
            <p className="text-sm tabular-nums text-muted-foreground">
              <span className="ltr:font-mono">
                <Num value={stages.length} pad={2} />
              </span>{" "}
              {t("sheet.stagesLabel")} · {t("sheet.oneSignature")}
            </p>
          </div>
          <div
            aria-hidden
            className={cn(
              SHEET_ROW,
              "eyebrow hidden border-b border-border-subtle py-3 text-muted-foreground lg:grid",
            )}
          >
            <span>#</span>
            <span>{t("sheet.columns.stage")}</span>
            <span>{t("sheet.columns.commitment")}</span>
            <span className="justify-self-end">
              {t("sheet.columns.signedBy")}
            </span>
          </div>
          <ol className="list-none">
            {stages.map((stage, index) => (
              <li
                key={stage.title}
                data-ledger-row
                className={cn(SHEET_ROW, "border-b border-border-subtle py-7 md:py-9")}
              >
                <span
                  aria-hidden
                  className="pt-1 text-sm tabular-nums text-muted-foreground md:text-base ltr:font-mono lg:pt-0"
                >
                  <Num value={index + 1} pad={2} />
                </span>
                <h4 className="text-[clamp(1.25rem,1.6vw,1.625rem)] font-medium leading-snug text-foreground">
                  {stage.title}
                </h4>
                <p className="col-start-2 mt-2 max-w-[60ch] text-[clamp(0.9375rem,1vw,1.0625rem)] leading-relaxed text-muted-foreground lg:col-start-3 lg:mt-0">
                  {stage.body}
                </p>
                <div className="col-start-2 mt-5 flex items-baseline gap-3 lg:col-start-4 lg:mt-0 lg:justify-self-end">
                  <span
                    aria-hidden
                    className="text-sm text-muted-foreground lg:hidden"
                  >
                    {t("sheet.columns.signedBy")}
                  </span>
                  <span
                    aria-hidden
                    className="min-w-20 border-b border-foreground/45 px-1 pb-1 text-center text-2xl leading-none text-foreground ltr:font-serif ltr:italic"
                  >
                    {t("sheet.initials")}
                  </span>
                  <span className="sr-only">
                    {t("sheet.signedBy", { name: founderName })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-16 md:mt-20">
            <RegisterDivider label={t("testimonials.eyebrow")} />
          </div>
          <div className="mt-10 grid gap-12 md:mt-12 lg:grid-cols-2 lg:gap-16">
            {testimonials.map((item) => (
              <figure
                key={item.id}
                data-ledger-row
                className="flex flex-col justify-between"
              >
                <blockquote className="max-w-[52ch] text-[clamp(1.0625rem,1.35vw,1.3125rem)] leading-[1.6] text-foreground/85">
                  {item.quote[locale]}
                </blockquote>
                <figcaption className="mt-6 flex flex-col items-start gap-1 border-t border-foreground/25 pt-3 text-sm">
                  <span className="font-medium text-foreground">
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
                      className="mt-1 inline-flex min-h-6 items-center text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
                    >
                      {tW("labels.viewCaseStudy")}
                    </DirectionalLink>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Container>
      <div
        ref={closingFrameRef}
        className="mt-20 px-6 sm:px-8 md:mt-28 md:px-12 lg:px-16"
      >
        <div
          ref={closingMediaRef}
          className="relative h-104 w-full overflow-hidden rounded-panel-sm sm:h-120 md:h-136 lg:h-152"
        >
          <Image
            ref={closingImageRef}
            src="/images/trust/founder-closing.jpg"
            alt=""
            aria-hidden
            fill
            quality={100}
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
