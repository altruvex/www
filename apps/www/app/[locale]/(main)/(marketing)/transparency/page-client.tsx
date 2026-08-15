"use client";

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
          {/* Four questions, all answered in the open.
              An accordion is for compressing a long list; with four items it
              only buys a click and costs the answer. On the page whose whole
              claim is that nothing is withheld, collapsing the answers was the
              wrong affordance — and `faq-section` on the homepage already owns
              the accordion device. */}
          <dl className="list-none border-b border-border">
            {items.map((item) => (
              <div
                key={item.value}
                className="grid gap-x-10 gap-y-3 border-t border-border py-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-8"
              >
                <dt className="text-[clamp(1.0625rem,1.15vw,1.1875rem)] font-medium leading-snug text-foreground">
                  {item.question}
                </dt>
                <dd className="max-w-[58ch] text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
