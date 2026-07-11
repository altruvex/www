"use client";

import { Link } from "@/i18n/navigation";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import { gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo, useRef } from "react";

interface WorkItemProps {
  slug: string;
  index: number;
}

const getDomainName = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const WorkItem = memo(function WorkItem({ slug, index }: WorkItemProps) {
  const tW = useTranslations("work");
  const tCS = useTranslations("caseStudies");

  const name = tCS(`${slug}.name`);
  const client = tCS(`${slug}.client`);
  const industry = tCS(`${slug}.industry`);
  const year = tCS(`${slug}.year`);
  const summary = tCS(`${slug}.summary`);
  const metrics = tCS.raw(`${slug}.metrics`) as Array<{
    label: string;
    value: string;
  }>;

  const caseStudy = getCaseStudyBySlug(slug);
  const externalUrl = caseStudy?.externalUrl;
  const screenshot = caseStudy?.screenshot;

  const cardRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMouseEnter = () => {
    if (!imageRef.current || prefersReducedMotion) return;
    gsap.to(imageRef.current, {
      opacity: 1,
      scale: 1,
      rotation: Math.random() * 3 - 1.5,
      duration: 0.3,
      ease: "power4.out",
      overwrite: "auto",
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current || !cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    gsap.to(imageRef.current, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      xPercent: -50,
      yPercent: -50,
      duration: 0.4,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  const handleMouseLeave = () => {
    if (!imageRef.current || prefersReducedMotion) return;
    gsap.to(imageRef.current, {
      opacity: 0,
      scale: 0.88,
      rotation: 0,
      duration: 0.2,
      ease: "power2.in",
      overwrite: "auto",
    });
  };

  return (
    <article
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="work-card group relative border-b border-s-border transition-all duration-300 hover:border-s-border-hover"
    >
      {screenshot && (
        <div
          ref={imageRef}
          className="pointer-events-none absolute left-0 top-0 z-50 hidden aspect-16/10 w-md max-w-[80vw] scale-75 overflow-hidden rounded-lg border border-s-border bg-surface opacity-0 shadow-card-lg md:block"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={`${screenshot}-light.png`}
            alt={`${name} - ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`${screenshot}-dark.png`}
            alt={`${name} - ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 28rem"
            className="hidden object-cover object-top dark:block"
          />
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 origin-left scale-x-0 bg-foreground/2 transition-all duration-300 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100 rtl:origin-right"
      />
      <Link
        href={`/work/${slug}`}
        className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`${tW("viewCaseStudy")} - ${name}`}
      />
      <div className="pointer-events-none relative z-20 px-4 py-10">
        <div className="mb-4 flex items-start justify-between gap-4 sm:gap-6">
          <div className="flex min-w-0 items-baseline gap-3 sm:gap-6 md:gap-10">
            <span className="text-[clamp(20px,2.5vw,28px)] font-light leading-none text-s-ghost tabular-nums transition-all duration-300 group-hover:text-brand-text group-focus-within:text-brand-text">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h2 className="mb-1 font-sans text-[clamp(18px,2.5vw,26px)] font-medium tracking-[-0.015em] text-primary transition-all duration-300 ltr:group-hover:translate-x-1.5 ltr:group-focus-within:translate-x-1.5 rtl:group-hover:-translate-x-1.5 rtl:group-focus-within:-translate-x-1.5">
                {name}
              </h2>
              <p className="font-mono text-sm leading-normal tracking-wider text-s-low uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                {client} · {industry}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-sm leading-normal tracking-wider text-s-low tabular-nums md:block">
              {year}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-s-border bg-s-surface text-s-mid transition-all duration-300 group-hover:border-brand/40 group-hover:bg-brand-soft group-hover:text-brand-text group-focus-within:border-brand/40 group-focus-within:bg-brand-soft group-focus-within:text-brand-text">
              <svg
                className="h-4 w-4 transition-all duration-300 ltr:group-hover:translate-x-0.5 ltr:group-focus-within:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 rtl:group-focus-within:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
        <div className="ps-[calc(clamp(20px,2.5vw,28px)+12px)] sm:ps-[calc(clamp(20px,2.5vw,28px)+24px)] md:ps-[calc(clamp(20px,2.5vw,28px)+40px)]">
          <p className="mb-4 text-base leading-relaxed text-s-mid">
            {summary}
          </p>
          {screenshot && (
            <div className="pointer-events-none relative mb-5 aspect-16/10 w-full max-w-md overflow-hidden rounded-md border border-s-border bg-surface md:hidden">
              <Image
                src={`${screenshot}-light.png`}
                alt={`${name} - ${client}`}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 28rem"
                className="object-cover object-top dark:hidden"
              />
              <Image
                src={`${screenshot}-dark.png`}
                alt={`${name} - ${client}`}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 28rem"
                className="hidden object-cover object-top dark:block"
              />
            </div>
          )}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-2">
              {metrics.slice(0, 2).map((metric) => (
                <div
                  key={metric.label}
                  className="inline-flex items-center gap-2 rounded-full border border-s-border bg-s-surface px-3 py-1 transition-all duration-300 group-hover:border-s-border-hover"
                >
                  <span className="font-mono text-sm leading-normal tracking-wider text-s-low uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                    {metric.label}
                  </span>
                  <span className="font-mono text-sm font-medium leading-normal tracking-wider text-brand-text tabular-nums">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <div
              onMouseEnter={handleMouseLeave}
              onMouseMove={(e) => e.stopPropagation()}
              onMouseLeave={handleMouseEnter}
              className="pointer-events-auto relative z-30 flex flex-wrap items-center gap-4 sm:gap-6"
            >
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center gap-2 rounded-sm font-mono text-sm leading-normal tracking-wider transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rtl:font-sans rtl:normal-case rtl:tracking-normal"
                >
                  <span className="text-s-mid uppercase transition-all group-hover/link:text-primary">
                    {tW("labels.visitProj")}
                  </span>
                  <span className="flex items-center gap-1 text-s-low lowercase transition-all group-hover/link:text-brand-text">
                    ({getDomainName(externalUrl)})
                    <svg
                      className="h-3.5 w-3.5 transition-all duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 rtl:group-hover/link:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
