"use client";

import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";

export function TransparencyChapter({
  className,
  eyebrow,
  index,
  lede,
  title,
  titleAs = "h2",
  titleId,
  titleItalic,
}: {
  className?: string;
  eyebrow: string;
  index?: number;
  lede?: ReactNode;
  title: string;
  titleAs?: "h1" | "h2";
  titleId: string;
  titleItalic?: string;
}) {
  const locale = useLocale();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const ledeRef = useSectionDescription<HTMLParagraphElement>();

  const Heading = titleAs;

  return (
    <header className={cn("scroll-mt-28", className)}>
      <div className="flex items-center gap-3 sm:gap-5">
        {index !== undefined ? (
          <span
            aria-hidden
            className="eyebrow shrink-0 self-start text-micro leading-none tabular-nums text-local-accent-text sm:self-center ltr:font-mono"
          >
            {localizeNumbers(String(index).padStart(2, "0"), locale)}
          </span>
        ) : null}
        <span
          aria-hidden
          className="hidden h-px w-10 shrink-0 bg-local-accent/50 sm:block"
        />
        <Eyebrow ref={eyebrowRef} className="min-w-0 text-micro leading-snug">
          {eyebrow}
        </Eyebrow>
        <span
          aria-hidden
          className="hidden h-px min-w-6 flex-1 bg-border-subtle sm:block"
        />
      </div>
      <span
        aria-hidden
        className="mt-4 block h-px w-full bg-border-subtle sm:hidden"
      />
      <div className="mt-10 grid gap-x-16 gap-y-6 lg:mt-14 lg:grid-cols-12 lg:items-end">
        <Heading
          id={titleId}
          ref={titleRef}
          className={cn(
            "section-title col-span-full m-0 font-normal text-foreground",
            lede
              ? "lg:col-span-7 lg:max-w-[18ch]"
              : "lg:col-span-9 lg:max-w-[24ch]",
          )}
        >
          {title}
          {titleItalic ? (
            <>
              <br className="hidden md:block" />
              <Highlight tone="soft" className="mt-2 block md:mt-0 md:inline">
                {titleItalic}
              </Highlight>
            </>
          ) : null}
        </Heading>
        {lede ? (
          <p
            ref={ledeRef}
            className="col-span-full max-w-[54ch] text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-relaxed text-muted-foreground lg:col-span-5 lg:pb-1.5"
          >
            {lede}
          </p>
        ) : null}
      </div>
    </header>
  );
}
