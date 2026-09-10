"use client";

import { Num } from "@/components/ui/num";
import { ArrowIcon } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo } from "react";

interface WorkRecordProps {
  slug: string;
  index: number;
  reverse?: boolean;
}
function getDomainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const WorkRecord = memo(function WorkRecord({
  slug,
  index,
  reverse = false,
}: WorkRecordProps) {
  const tW = useTranslations("work");
  const tCS = useTranslations("caseStudies");

  const name = tCS(`${slug}.name`);
  const client = tCS(`${slug}.client`);
  const industry = tCS(`${slug}.industry`);
  const year = tCS(`${slug}.year`);
  const summary = tCS(`${slug}.summary`);
  const metrics = tCS.raw(`${slug}.metrics`) as ReadonlyArray<{
    label: string;
    value: string;
  }>;

  const caseStudy = getCaseStudyBySlug(slug);
  const externalUrl = caseStudy?.externalUrl;
  const screenshot = caseStudy?.screenshot;

  return (
    <li
      data-work-record
      className={cn(
        "group grid gap-x-12 gap-y-8 border-t border-border py-10 md:py-12",
        reverse
          ? "md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          : "md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
      )}
    >
      <div className={cn(reverse && "md:order-2")}>
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="shrink-0 text-sm tabular-nums text-muted-foreground ltr:font-mono"
          >
            <Num value={index + 1} pad={2} />
          </span>
          <Eyebrow>
            {client} · {industry} · {year}
          </Eyebrow>
        </div>
        <h3 className="mt-4 text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          <Link
            href={`/work/${slug}`}
            className="rounded-sm outline-none transition-colors duration-300 ease-smooth hover:text-local-accent-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {name}
          </Link>
        </h3>
        <p className="mt-4 max-w-[58ch] text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
          {summary}
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt
                dir="auto"
                className="text-[clamp(1.25rem,2vw,1.625rem)] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground"
              >
                {metric.value}
              </dt>
              <dd className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground ltr:font-mono">
                {metric.label}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link
            href={`/work/${slug}`}
            className="group inline-flex min-h-6 items-center gap-2 rounded-sm text-base text-foreground outline-none transition-colors duration-300 ease-smooth hover:text-local-accent-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11"
          >
            {tW("labels.viewCaseStudy")}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center gap-2 rounded-sm text-base text-muted-foreground outline-none transition-colors duration-300 ease-smooth hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11"
            >
              {tW("labels.visitProj")}
              <span dir="ltr" className="ltr:font-mono">
                ({getDomainName(externalUrl)})
              </span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
      {screenshot && (
        <div className={cn("relative aspect-16/10 w-full overflow-hidden rounded-md border border-border bg-surface", reverse && "md:order-1")}>
          <Image
            src={`${screenshot}-light.png`}
            alt={`${name} — ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 34rem"
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`${screenshot}-dark.png`}
            alt={`${name} — ${client}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 34rem"
            className="hidden object-cover object-top dark:block"
          />
        </div>
      )}
    </li>
  );
});
