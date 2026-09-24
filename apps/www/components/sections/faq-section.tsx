"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { FaqList, type FaqListItem } from "@/components/shared/faq-list";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo, useId } from "react";

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
  const fillTokens = useFillPricingTokens();

  const questions = t.raw("questions") as Record<string, FaqEntry>;

  const items = questionKeys.flatMap((key) => {
    const entry = questions?.[key];
    if (!entry) return [];
    return [
      {
        id: key,
        question: fillTokens(entry.q ?? entry.question ?? ""),
        // Answers are prose that may quote a price; the figure comes from the
        // schema so it cannot drift from what /pricing renders.
        answer: fillTokens(entry.a ?? entry.answer ?? ""),
      },
    ];
  });

  return (
    <FaqSectionView
      eyebrow={t("title")}
      title={t("subtitle")}
      items={items}
      className={className}
    />
  );
});

type FaqSectionViewProps = {
  eyebrow: string;
  title: string;
  items: FaqListItem[];
  className?: string;
};

/**
 * Title column on the start side, the shared FAQ list beside it, and a way
 * out to /faq under the title. The title column holds still on wide screens
 * while the answers open, so the question being answered stays named.
 */
export function FaqSectionView({
  eyebrow,
  title,
  items,
  className,
}: FaqSectionViewProps) {
  const tFaq = useTranslations("faq");
  const headingId = useId();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const contentRef = useSectionDescription<HTMLDivElement>();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)",
        className,
      )}
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow ref={eyebrowRef} className="mb-4">
              {eyebrow}
            </Eyebrow>
            <h2
              id={headingId}
              ref={titleRef}
              className="max-w-[18ch] text-balance text-[clamp(1.875rem,3.2vw,2.75rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              {title}
            </h2>
            <DirectionalLink
              href="/faq"
              className="mt-8 inline-flex min-h-6 items-center text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tFaq("allQuestions")}
            </DirectionalLink>
          </div>

          <div ref={contentRef}>
            <FaqList items={items} />
          </div>
        </div>
      </Container>
    </section>
  );
}
