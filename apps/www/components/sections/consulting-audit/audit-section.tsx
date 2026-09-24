"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

/**
 * The frame every numbered section on /services/consulting sits in.
 *
 * Four sections were each hand-rolling the same thing — a hairline top rule,
 * the section rhythm, an eyebrow, a two-clause heading with the world-coloured
 * serif italic, a lede, and a small honesty note at the bottom — with their own
 * `clamp()` for the heading instead of the house `.section-title`. That is four
 * places for the page to drift from itself and from the rest of the site.
 *
 * The heading itself is `SectionHeading`, the site's own: it already owns the
 * type scale, the `italicWorld` accent clause, the heading-left /
 * description-right split, and the three refs the section motion hooks attach
 * to. Nothing here re-implements it.
 */
export function AuditSection({
  id,
  titleId,
  eyebrow,
  title,
  titleAccent,
  description,
  note,
  bodyClassName,
  children,
}: {
  id: string;
  titleId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  titleAccent?: ReactNode;
  description?: ReactNode;
  /** The small print under the device — what it does and does not claim. */
  note?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descriptionRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="border-t border-border-subtle bg-background pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          firstTitle={title}
          secondTitle={titleAccent}
          secondTitleBreak={false}
          italicWorld
          description={description}
          titleId={titleId}
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descriptionRef}
        />

        <div className={cn("mt-12", bodyClassName)}>{children}</div>

        {note ? (
          <p className="mt-6 max-w-[64ch] text-xs leading-relaxed text-muted-foreground">
            {note}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
