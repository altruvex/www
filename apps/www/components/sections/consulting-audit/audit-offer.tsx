"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Eyebrow } from "@repo/ui/www";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import type { ConsultingView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";
import { ServiceSection } from "@/components/sections/services-index/service-section";

export function AuditOffer({ audit }: { audit: ConsultingView }) {
  const t = useTranslations("serviceDetails.consulting.audit.offer");
  const tCTAs = useTranslations("commercial.ctas");

  return (
    <ServiceSection
      id="audit-offer"
      titleId="consulting-offer-heading"
      eyebrow={t("forkEyebrow")}
      title={audit.title}
      titleAccent={audit.titleItalic}
      description={t.rich("description", bodyMarks)}
    >
      {audit.creditIfBuild && audit.creditIfNot ? (
        <div className="grid items-center gap-9 md:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">
          <p className="text-[clamp(2.7rem,6vw,6.5rem)] leading-[0.9] font-light tracking-[-0.045em] text-foreground rtl:tracking-normal">
            {audit.priceLabel}
            <span className="eyebrow mt-4 block text-muted-foreground">
              {audit.priceLabelCaption}
            </span>
          </p>
          <div>
            <Arm accent label={t("ifBuild")} body={audit.creditIfBuild} />
            <Arm label={t("ifNot")} body={audit.creditIfNot} />
          </div>
        </div>
      ) : null}
      <div className="mt-(--section-block) grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Eyebrow className="mb-4">{audit.includedLabel}</Eyebrow>
          <ul className="list-none">
            {audit.deliverables.map((item) => (
              <li
                key={item}
                className="border-t border-border-subtle py-3 text-sm leading-relaxed text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:self-end">
          <CtaButtonGroup
            primaryVariant="accent"
            primary={{
              href: getCommercialCta("technicalAudit").href,
              label: tCTAs("technicalAudit"),
            }}
          />
        </div>
      </div>
    </ServiceSection>
  );
}

function Arm({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? "border-t-2 border-local-accent py-5"
          : "border-t border-b border-border-subtle py-5"
      }
    >
      <Eyebrow tone={accent ? "accent" : "muted"}>{label}</Eyebrow>
      <p className="mt-2.5 max-w-[44ch] text-[clamp(1rem,1.5vw,1.25rem)] leading-snug text-foreground">
        {body}
      </p>
    </div>
  );
}
