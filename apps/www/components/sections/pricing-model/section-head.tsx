"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Num } from "@/components/ui/num";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";

/**
 * The /pricing section head: a grey mono index, the title, and the lead on the
 * reading side. A client island only because the entrance hooks need refs;
 * everything under it renders on the server.
 */
export function ModelSectionHead({
  index,
  id,
  title,
  lead,
}: {
  index: number;
  id: string;
  title: string;
  lead: string;
}) {
  const eyebrowRef = useSectionEyebrow<HTMLDivElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <SectionHeading
      titleId={id}
      customEyebrow
      eyebrowRef={eyebrowRef}
      titleRef={titleRef}
      descriptionRef={descRef}
      eyebrow={
        <span className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
          <Num value={index} pad={2} />
        </span>
      }
      firstTitle={title}
      description={lead}
      className="mb-14 md:mb-20"
      classes={{
        title: "max-w-[22ch]",
        description: "lg:max-w-[24rem]",
      }}
    />
  );
}
