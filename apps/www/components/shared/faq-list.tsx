"use client";

import { Num } from "@/components/ui/num";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";

export type FaqListItem = {
  id: string;
  question: string;
  answer: string | ReactNode;
};

type FaqListProps = {
  items: FaqListItem[];
  startIndex?: number;
  className?: string;
};

const ANSWER_PROSE =
  "max-w-[68ch] text-[clamp(0.9375rem,0.98vw,1.0625rem)] leading-[1.7] text-muted-foreground [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:ps-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:ps-5 [&_li]:ps-1 [&_li::marker]:text-foreground/40 [&_strong]:font-medium [&_strong]:text-foreground";

export function FaqList({ items, startIndex = 1, className }: FaqListProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className={cn("w-full border-t border-border-subtle", className)}
    >
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="group/faq border-b border-border-subtle last:border-b"
        >
          <AccordionTrigger className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-4 rounded-none py-6 text-start text-[clamp(1.0625rem,1.1vw,1.1875rem)] font-normal leading-snug text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background md:grid-cols-[3rem_minmax(0,1fr)_auto] md:py-7 [&>svg]:self-center [&>svg]:text-foreground/60 [&>svg]:duration-(--motion-drawer) [&[data-state=open]>svg]:text-foreground">
            <span
              aria-hidden
              className="text-sm tabular-nums text-muted-foreground transition-colors group-data-[state=open]/faq:text-local-accent-text ltr:font-mono"
            >
              <Num value={startIndex + index} pad={2} />
            </span>
            <span className="transition-colors group-hover/faq:text-foreground">
              {item.question}
            </span>
          </AccordionTrigger>
          <AccordionContent
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-8 md:grid-cols-[3rem_minmax(0,1fr)] md:pb-10"
          >
            <span aria-hidden />
            {typeof item.answer === "string" ? (
              <div
                className={ANSWER_PROSE}
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            ) : (
              <div className={ANSWER_PROSE}>
                <p>{item.answer}</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
