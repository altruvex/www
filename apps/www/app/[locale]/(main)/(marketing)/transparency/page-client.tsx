"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { Container } from "@/components/shared/container";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import type { ProjectType } from "@/hooks/use-transparency";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const PROJECT_TYPES = ["website", "webapp", "ecommerce", "pwa"] as const;

export default function TransparencyPageClient() {
  const searchParams = useSearchParams();

  const initialTier = searchParams.get("tier");
  const rawProjectType = searchParams.get("projectType") ?? "";
  const initialProjectType = (
    PROJECT_TYPES.includes(rawProjectType as (typeof PROJECT_TYPES)[number])
      ? rawProjectType
      : null
  ) as ProjectType;

  return (
    <>
      <TransparencyEstimator
        pageHeading
        initialTier={initialTier}
        initialProjectType={initialProjectType}
      />
      <TransparencyFaqSection />
    </>
  );
}

function TransparencyFaqSection() {
  const t = useTranslations("transparency");

  const items = ["1", "2", "3", "4"].map((key) => ({
    answer: t.rich(`faq.a${key}`, bodyMarks),
    question: t(`faq.q${key}`),
    value: key,
  }));

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div className="max-w-md">
            <Eyebrow className="mb-4 block text-xs">{t("faq.title")}</Eyebrow>
            <h2 className="mb-6 text-[clamp(2.125rem,4vw,3.25rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
              {t("faq.subtitle")}
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-foreground/2 px-5 md:px-8">
            <Accordion type="single" collapsible className="w-full">
              {items.map((item) => (
                <AccordionItem
                  key={item.value}
                  value={item.value}
                  className="border-border"
                >
                  <AccordionTrigger className="py-6 text-start font-sans text-[clamp(1.0625rem,1.05vw,1.125rem)] font-light leading-[1.75] transition-all hover:text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-8 text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  );
}
