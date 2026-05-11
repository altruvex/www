"use client";

import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEFAULTS, MOTION, useReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";

interface FaqSectionProps {
  namespace: string;
  className?: string;
}

export const FaqSection = memo(function FaqSection({
  namespace,
  className,
}: FaqSectionProps) {
  const t = useTranslations(namespace);

  const headerRef = useReveal<HTMLDivElement>({ ...DEFAULTS.body, delay: 0 });
  const contentRef = useReveal<HTMLDivElement>({
    ...DEFAULTS.body,
    delay: 0.15,
    ease: MOTION.ease.smooth,
    distance: 28,
  });

  const questionKeys = ["01", "02", "03", "04", "05"];

  return (
    <section
      className={cn(
        "border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)",
        className,
      )}
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div ref={headerRef} className="max-w-md">
            <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4 block">
              {t("faq.title")}
            </p>
            <h2 className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.1] mb-6">
              {t("faq.subtitle")}
            </h2>
          </div>

          <div
            ref={contentRef}
            className="rounded-2xl border border-border bg-foreground/3 px-5 md:px-8"
          >
            <Accordion type="single" collapsible className="w-full">
              {questionKeys.map((key) => (
                <AccordionItem key={key} value={key} className="border-border">
                  <AccordionTrigger className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] font-sans font-light hover:text-foreground transition-colors py-6 text-start">
                    {t(`faq.questions.${key}.q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed pb-8">
                    {t(`faq.questions.${key}.a`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  );
});
