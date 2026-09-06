"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { Container } from "@/components/shared/container";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import type { ProjectType } from "@/hooks/use-transparency";
import {
  publicAddonViews,
  termsView,
  type Locale,
} from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
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
      <CommercialTermsSection />
      <TransparencyFaqSection />
    </>
  );
}

/**
 * The terms a client would otherwise meet for the first time at signing.
 *
 * VAT and the revision rate were hardcoded inside the contract builder and
 * published nowhere, so anyone budgeting from this page was 14% short by the
 * time they saw a contract. Pass-through items are stated as cost plus a named
 * margin, and each is rendered as its own row — never folded into a project
 * total. All figures come from packages/pricing-schema.
 */
function CommercialTermsSection() {
  const t2 = useTranslations("transparency");
  const locale = useLocale() as Locale;
  const terms = termsView(locale);
  const addons = publicAddonViews(locale);

  const rows = [
    { key: "vat", label: terms.vatLabel, value: terms.vatNote },
    { key: "revision", label: terms.revisionLabel, value: terms.revisionNote },
    { key: "usd", label: terms.usdLabel, value: terms.usdNote },
    { key: "addons", label: terms.addonLabel, value: terms.addonNote },
  ];

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div className="max-w-md">
            <Eyebrow className="mb-4 block text-xs">{t2("terms.title")}</Eyebrow>
            <h2 className="mb-6 text-[clamp(2.125rem,4vw,3.25rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
              {t2("terms.subtitle")}
            </h2>
          </div>
          <div>
            <dl className="list-none border-b border-border">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-x-10 gap-y-3 border-t border-border py-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-8"
                >
                  <dt className="text-[clamp(1.0625rem,1.15vw,1.1875rem)] font-medium leading-snug text-foreground">
                    {row.label}
                  </dt>
                  <dd className="max-w-[58ch] text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {addons.length > 0 && (
              <table className="mt-10 w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-3 pe-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t2("terms.itemColumn")}
                    </th>
                    <th scope="col" className="py-3 pe-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {terms.costBasisLabel}
                    </th>
                    <th scope="col" className="py-3 pe-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {terms.markupLabel}
                    </th>
                    <th scope="col" className="py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {terms.totalLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr key={addon.id} className="border-b border-border">
                      <td className="py-4 pe-4 text-sm text-foreground">{addon.name}</td>
                      <td className="py-4 pe-4 font-mono text-sm text-muted-foreground">
                        {addon.costBasisLabel ?? addon.pendingLabel}
                      </td>
                      <td className="py-4 pe-4 font-mono text-sm text-muted-foreground">
                        {addon.markupLabel ?? "—"}
                      </td>
                      <td className="py-4 font-mono text-sm text-foreground">
                        {addon.totalLabel ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Container>
    </section>
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
