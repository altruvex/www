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

export function ServiceSection({
  id,
  titleId,
  eyebrow,
  title,
  titleAccent,
  description,
  note,
  bodyClassName,
  italicWorld = true,
  children,
}: {
  id: string;
  titleId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  titleAccent?: ReactNode;
  description?: ReactNode;
  note?: ReactNode;
  bodyClassName?: string;
  /** false when the second clause is a loss clause: it stays dimmed italic, never world colour. */
  italicWorld?: boolean;
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
          italicWorld={italicWorld}
          description={description}
          titleId={titleId}
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descriptionRef}
        />

        <div className={cn("mt-(--heading-gap)", bodyClassName)}>{children}</div>

        {note ? (
          <p className="mt-6 max-w-[64ch] text-xs leading-relaxed text-muted-foreground">
            {note}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
