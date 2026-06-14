"use client";

import { memo, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCaseStudyBySlug } from "@/lib/case-studies";

interface WorkItemProps {
  slug: string;
  index: number;
}

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
      className="work-card group relative border-b border-foreground/8 py-10"
    >
      {/* Dynamic Cursor-Following Desktop Image Showcase */}
      {screenshot && (
        <div
          ref={imageRef}
          className="pointer-events-none absolute left-0 top-0 z-50 hidden aspect-16/10 w-md max-w-[80vw] scale-75 overflow-hidden rounded-lg border border-foreground/8 bg-foreground/2 opacity-0 shadow-2xl md:block"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={`${screenshot}-light.png`}
            alt={`${name} — ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`${screenshot}-dark.png`}
            alt={`${name} — ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 28rem"
            className="hidden object-cover object-top dark:block"
          />
        </div>
      )}
      <div
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 bg-foreground/2 transition-transform duration-300 ease-out group-hover:scale-x-100 rtl:origin-right pointer-events-none"
      />
      <div className="relative z-10 px-4">
        <div className="mb-4 flex items-start justify-between gap-6">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span
              className="font-mono text-sm font-light leading-normal tracking-wider text-primary/20 transition-colors duration-300 group-hover:text-primary/55"
              style={{
                fontSize: "clamp(20px, 2.5vw, 28px)",
                letterSpacing: "-0.02em",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2
                className="mb-1 font-sans font-medium text-primary transition-transform duration-300 ltr:group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5"
                style={{
                  fontSize: "clamp(18px, 2.5vw, 26px)",
                  letterSpacing: "-0.015em",
                }}
              >
                <Link
                  href={`/work/${slug}`}
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-8 before:absolute before:inset-0 before:z-0"
                >
                  {name}
                </Link>
              </h2>
              <p className="font-mono text-sm leading-normal tracking-wider text-foreground/35 uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                {client} · {industry}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-sm leading-normal tracking-wider text-muted-foreground/70 md:block">
              {year}
            </span>
            <svg
              className="h-4 w-4 text-muted-foreground/70 transition-[transform,color] duration-300 group-hover:text-primary/60 ltr:group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
        <div className="ps-[calc(clamp(20px,2.5vw,28px)+24px)] md:ps-[calc(clamp(20px,2.5vw,28px)+40px)]">
          <p className="mb-4 max-w-[52ch] text-base leading-relaxed text-primary/60">
            {summary}
          </p>
          {screenshot && (
            <div className="pointer-events-none relative mb-5 aspect-16/10 w-full max-w-md overflow-hidden rounded-md border border-foreground/8 bg-foreground/2 md:hidden">
              <Image
                src={`${screenshot}-light.png`}
                alt={`${name} — ${client}`}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 28rem"
                className="object-cover object-top dark:hidden"
              />
              <Image
                src={`${screenshot}-dark.png`}
                alt={`${name} — ${client}`}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 28rem"
                className="hidden object-cover object-top dark:block"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="pointer-events-none relative z-10 flex flex-wrap gap-2">
              {metrics.slice(0, 2).map((metric) => (
                <div
                  key={metric.label}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/8 bg-foreground/2 px-3 py-1"
                >
                  <span className="font-mono text-sm leading-normal tracking-wider text-foreground/35 uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                    {metric.label}
                  </span>
                  <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex items-center gap-6">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm font-mono text-sm leading-normal tracking-wider text-primary/60 uppercase transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rtl:font-sans rtl:normal-case rtl:tracking-normal"
                >
                  {tW("labels.visitProj")} ↗
                </a>
              )}
              <span className="pointer-events-none hidden items-center gap-2 font-mono text-sm leading-normal tracking-wider text-primary/70 transition-colors duration-300 group-hover:text-primary/100 md:inline-flex">
                {tW("viewCaseStudy")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});