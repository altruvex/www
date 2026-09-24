"use client";

import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { FaqList } from "@/components/shared/faq-list";
import { bodyMarks } from "@/components/ui/rich-text";
import type { ProjectType } from "@/hooks/use-transparency";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
} from "@/lib/motion";
import type { AddonView, TermsView } from "@repo/pricing-schema";
import { getCommercialCta } from "@/lib/config/commercial";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const PROJECT_TYPES = ["website", "webapp", "ecommerce", "pwa"] as const;

export default function TransparencyPageClient({
  terms,
  addons,
}: {
  terms: TermsView;
  addons: readonly AddonView[];
}) {
  const searchParams = useSearchParams();

  const initialTier = searchParams.get("tier");
  const rawProjectType = searchParams.get("projectType") ?? "";

  const initialProjectType = (
    PROJECT_TYPES.includes(
      rawProjectType as (typeof PROJECT_TYPES)[number],
    )
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

      <CommercialTermsSection terms={terms} addons={addons} />

      <TransparencyFaqSection />
    </>
  );
}

function CommercialTermsSection({
  terms,
  addons,
}: {
  terms: TermsView;
  addons: readonly AddonView[];
}) {
  const t = useTranslations("transparency");

  const cellsRef = useSectionCardGrid<HTMLDListElement>({
    selector: "[data-term]",
  });

  const rows = [
    {
      key: "vat",
      label: terms.vatLabel,
      value: terms.vatNote,
    },
    {
      key: "revision",
      label: terms.revisionLabel,
      value: terms.revisionNote,
    },
    {
      key: "usd",
      label: terms.usdLabel,
      value: terms.usdNote,
    },
    {
      key: "addons",
      label: terms.addonLabel,
      value: terms.addonNote,
    },
  ];

  return (
    <section
      aria-labelledby="transparency-terms-heading"
      className="border-t border-border-subtle py-24 sm:py-28 lg:py-36"
    >
      <Container>
        <TransparencyChapter
          index={1}
          titleId="transparency-terms-heading"
          eyebrow={t("terms.title")}
          title={t("terms.subtitle")}
        />
        <dl
          ref={cellsRef}
          className="
            mt-12
            grid
            overflow-hidden
            rounded-panel-lg
            border
            border-border-subtle
            bg-black/2.5
            sm:grid-cols-2
            lg:mt-16
            dark:bg-white/4.5
          "
        >
          {rows.map((row) => (
            <div
              key={row.key}
              data-term
              className="
                border-b
                border-border-subtle
                bg-background
                p-7
                last:border-b-0
                sm:p-8
                sm:nth-[2n]:border-s-0
                sm:nth-last-[2]:border-b-0
                lg:p-10
              "
            >
              <dt
                className="
                  text-[1.0625rem]
                  font-semibold
                  leading-[1.35]
                  tracking-[-0.015em]
                  text-foreground
                  sm:text-[1.125rem]
                "
              >
                {row.label}
              </dt>
              <dd
                className="
                  mt-3
                  max-w-[52ch]
                  text-[0.9375rem]
                  leading-[1.6]
                  text-muted-foreground
                  sm:text-[1rem]
                "
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {addons.length > 0 && (
          <div
            className="
              mt-6
              overflow-hidden
              rounded-panel-lg
              border
              border-border-subtle
              bg-background
              lg:mt-8
            "
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-start">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th
                      scope="col"
                      className="
                        px-6
                        py-4
                        text-start
                        text-[0.8125rem]
                        font-medium
                        text-muted-foreground
                        sm:px-8
                        lg:px-10
                      "
                    >
                      {t("terms.itemColumn")}
                    </th>
                    <th
                      scope="col"
                      className="
                        px-6
                        py-4
                        text-start
                        text-[0.8125rem]
                        font-medium
                        text-muted-foreground
                        sm:px-8
                        lg:px-10
                      "
                    >
                      {terms.costBasisLabel}
                    </th>
                    <th
                      scope="col"
                      className="
                        px-6
                        py-4
                        text-start
                        text-[0.8125rem]
                        font-medium
                        text-muted-foreground
                        sm:px-8
                        lg:px-10
                      "
                    >
                      {terms.markupLabel}
                    </th>
                    <th
                      scope="col"
                      className="
                        px-6
                        py-4
                        text-start
                        text-[0.8125rem]
                        font-medium
                        text-muted-foreground
                        sm:px-8
                        lg:px-10
                      "
                    >
                      {terms.totalLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr
                      key={addon.id}
                      className="
                        border-b
                        border-border-subtle
                        transition-colors
                        last:border-b-0
                        hover:bg-black/[0.018]
                        dark:hover:bg-white/2.5
                      "
                    >
                      <td
                        className="
                          px-6
                          py-5
                          text-[0.9375rem]
                          font-medium
                          text-foreground
                          sm:px-8
                          lg:px-10
                        "
                      >
                        {addon.name}
                      </td>
                      <td
                        className="
                          px-6
                          py-5
                          text-[0.875rem]
                          tabular-nums
                          text-muted-foreground
                          sm:px-8
                          lg:px-10
                          ltr:font-mono
                        "
                      >
                        {addon.costBasisLabel ?? addon.pendingLabel}
                      </td>
                      <td
                        className="
                          px-6
                          py-5
                          text-[0.875rem]
                          tabular-nums
                          text-muted-foreground
                          sm:px-8
                          lg:px-10
                          ltr:font-mono
                        "
                      >
                        {addon.markupLabel ?? "—"}
                      </td>
                      <td
                        className="
                          px-6
                          py-5
                          text-[0.875rem]
                          font-medium
                          tabular-nums
                          text-foreground
                          sm:px-8
                          lg:px-10
                          ltr:font-mono
                        "
                      >
                        {addon.totalLabel ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

function TransparencyFaqSection() {
  const t = useTranslations("transparency");
  const tFaq = useTranslations("faq");
  const tCTAs = useTranslations("commercial.ctas");
  const { warrantyDays } = usePricingTokens();

  const noteRef = useSectionElement<HTMLDivElement>();
  const listRef = useSectionDescription<HTMLDivElement>();

  // Same FAQ device as /faq and every other page: one collapsing list, so a
  // visitor who has opened a question anywhere on the site knows this one.
  // The chapter header stays, because this page is read as numbered chapters.
  const items = ["1", "2", "3", "4"].map((key) => ({
    id: key,
    question: t(`faq.q${key}`),
    answer: t.rich(`faq.a${key}`, {
      ...bodyMarks,
      warrantyDays,
    }),
  }));

  return (
    <section
      aria-labelledby="transparency-faq-heading"
      className="border-t border-border-subtle py-24 sm:py-28 lg:py-36"
    >
      <Container>
        <TransparencyChapter
          index={2}
          titleId="transparency-faq-heading"
          eyebrow={t("faq.title")}
          title={t("faq.subtitle")}
        />

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-16">
          <div
            ref={noteRef}
            className="lg:sticky lg:top-28 lg:col-span-3 lg:self-start"
          >
            <p className="max-w-[32ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
              {t("faq.more")}
            </p>
            <DirectionalLink
              href="/faq"
              className="mt-4 inline-flex min-h-6 items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tFaq("allQuestions")}
            </DirectionalLink>
            {/* The estimator above is this page's conversion; this is the way
                out for a visitor who read to the end and would rather talk. */}
            <DirectionalLink
              href={getCommercialCta("technicalCall").href}
              className="mt-2 flex min-h-6 w-fit items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tCTAs("technicalCall")}
            </DirectionalLink>
          </div>

          <div
            ref={listRef}
            className="lg:col-span-8 lg:col-start-5"
          >
            <FaqList items={items} />
          </div>
        </div>
      </Container>
    </section>
  );
}
