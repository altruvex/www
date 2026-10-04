"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Num } from "@/components/ui/num";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { LABEL, LEAD, SECTION_TITLE } from "./type";

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
        <span className={`${LABEL} tabular-nums`}>
          <Num value={index} pad={2} />
        </span>
      }
      firstTitle={title}
      description={lead}
      className="mb-(--heading-gap) max-w-[56rem]"
      classes={{
        container: "gap-7 md:gap-7 lg:flex-col lg:items-start",
        titleWrapper: "space-y-7",
        title: `${SECTION_TITLE} max-w-[18ch]`,
        description: `${LEAD} max-w-[36ch] md:max-w-[36ch] lg:max-w-[36ch]`,
      }}
    />
  );
}
