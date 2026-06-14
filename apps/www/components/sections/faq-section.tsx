"use client";

import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import ReactMarkdown from "react-markdown";

interface FaqSectionProps {
  namespace: string;
  className?: string;
  questionKeys?: string[];
}

type FaqEntry = {
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
};

const DEFAULT_QUESTION_KEYS = ["01", "02", "03", "04", "05"];

export const FaqSection = memo(function FaqSection({
  namespace,
  className,
  questionKeys = DEFAULT_QUESTION_KEYS,
}: FaqSectionProps) {
  const t = useTranslations(namespace);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle();
  const contentRef = useSectionDescription<HTMLDivElement>();

  const questions = t.raw("questions") as Record<string, FaqEntry>;

  return (
    <section
      className={cn(
        "border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)",
        className,
      )}
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div className="max-w-md">
            <p
              ref={eyebrowRef}
              className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4 block"
            >
              {t("title")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.1] mb-6"
            >
              {t("subtitle")}
            </h2>
          </div>

          <div
            ref={contentRef}
            className="liquid-glass-panel rounded-2xl px-5 md:px-8"
          >
            <Accordion type="single" collapsible className="w-full">
              {questionKeys.map((key) => {
                const entry = questions?.[key];
                if (!entry) return null;
                const question = entry.q ?? entry.question ?? "";
                const answer = entry.a ?? entry.answer ?? "";
                return (
                  <AccordionItem key={key} value={key} className="border-border">
                    <AccordionTrigger className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] font-sans font-light hover:text-foreground transition-colors py-6 text-start">
                      {question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed pb-8">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-3 ml-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-3 ml-2">{children}</ol>,
                          li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        }}
                      >
                        {answer}
                      </ReactMarkdown>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  );
});
