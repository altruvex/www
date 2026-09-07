"use client";

import { bodyMarks } from "@/components/ui/rich-text";
import { Container } from "@/components/shared/container";
import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import type { ProjectType } from "@/hooks/use-transparency";
import { useSectionCardGrid } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import type { AddonView, TermsView } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
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
      <CommercialTermsSection terms={terms} addons={addons} />
      <TransparencyFaqSection />
    </>
  );
}

/**
 * Presentation: a hairline cell grid, not a stack of rows. Four terms of equal
 * standing are peers, and a grid says peer where a list says sequence. The
 * pass-through ledger below it keeps the tabular form its numbers need, inside
 * a frame that survives a phone.
 */
function CommercialTermsSection({
  terms,
  addons,
}: {
  terms: TermsView;
  addons: readonly AddonView[];
}) {
  const t2 = useTranslations("transparency");

  const cellsRef = useSectionCardGrid<HTMLDListElement>({
    selector: "[data-term]",
  });

  const rows = [
    { key: "vat", label: terms.vatLabel, value: terms.vatNote },
    { key: "revision", label: terms.revisionLabel, value: terms.revisionNote },
    { key: "usd", label: terms.usdLabel, value: terms.usdNote },
    { key: "addons", label: terms.addonLabel, value: terms.addonNote },
  ];

  return (
    <section
      aria-labelledby="transparency-terms-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={1}
          titleId="transparency-terms-heading"
          eyebrow={t2("terms.title")}
          title={t2("terms.subtitle")}
        />

        {/* gap-px over a border-coloured ground draws the hairlines, so the
            grid stays one object at every breakpoint instead of collapsing
            into four detached cards. */}
        <dl
          ref={cellsRef}
          className="mt-14 grid list-none gap-px overflow-hidden rounded-lg border border-border bg-border lg:mt-20 sm:grid-cols-2"
        >
          {rows.map((row) => (
            <div
              key={row.key}
              data-term
              className="bg-background p-7 sm:p-8 lg:p-10"
            >
              <dt className="text-[clamp(1.0625rem,1.15vw,1.1875rem)] font-medium leading-snug text-foreground">
                {row.label}
              </dt>
              <dd className="mt-4 max-w-[52ch] text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {addons.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-lg border border-border lg:mt-7">
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 border-collapse text-start">
                <thead>
                  <tr className="border-b border-border bg-surface/60">
                    <th scope="col" className="px-7 py-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground lg:px-10">
                      {t2("terms.itemColumn")}
                    </th>
                    <th scope="col" className="px-7 py-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground lg:px-10">
                      {terms.costBasisLabel}
                    </th>
                    <th scope="col" className="px-7 py-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground lg:px-10">
                      {terms.markupLabel}
                    </th>
                    <th scope="col" className="px-7 py-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground lg:px-10">
                      {terms.totalLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr key={addon.id} className="border-b border-border last:border-b-0">
                      <td className="px-7 py-5 text-sm text-foreground lg:px-10">{addon.name}</td>
                      <td className="px-7 py-5 text-sm tabular-nums text-muted-foreground lg:px-10 ltr:font-mono">
                        {addon.costBasisLabel ?? addon.pendingLabel}
                      </td>
                      <td className="px-7 py-5 text-sm tabular-nums text-muted-foreground lg:px-10 ltr:font-mono">
                        {addon.markupLabel ?? "—"}
                      </td>
                      <td className="px-7 py-5 text-sm tabular-nums text-foreground lg:px-10 ltr:font-mono">
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
  const locale = useLocale();

  const itemsRef = useSectionCardGrid<HTMLDListElement>({
    selector: "[data-faq]",
  });

  const items = ["1", "2", "3", "4"].map((key) => ({
    answer: t.rich(`faq.a${key}`, bodyMarks),
    question: t(`faq.q${key}`),
    value: key,
  }));

  return (
    <section
      aria-labelledby="transparency-faq-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={2}
          titleId="transparency-faq-heading"
          eyebrow={t("faq.title")}
          title={t("faq.subtitle")}
        />

        {/* Four questions, all answered in the open.
            An accordion is for compressing a long list; with four items it
            only buys a click and costs the answer. On the page whose whole
            claim is that nothing is withheld, collapsing the answers was the
            wrong affordance — and `faq-section` on the homepage already owns
            the accordion device.

            Open answers in two columns, each opening on its own rule: the
            terms above are a closed grid of facts, so the questions read as
            the page's open half rather than a second table of the same shape. */}
        <dl
          ref={itemsRef}
          className="mt-14 grid list-none gap-x-16 gap-y-10 lg:mt-20 md:grid-cols-2 lg:gap-y-14"
        >
          {items.map((item, index) => (
            <div key={item.value} data-faq className="border-t border-border pt-7">
              <span
                aria-hidden
                className="eyebrow block text-[11px] leading-none tabular-nums text-local-accent-text ltr:font-mono"
              >
                {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
              </span>
              <dt className="mt-5 text-[clamp(1.125rem,1.35vw,1.3125rem)] font-medium leading-snug text-balance text-foreground">
                {item.question}
              </dt>
              <dd className="mt-4 max-w-[58ch] text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
