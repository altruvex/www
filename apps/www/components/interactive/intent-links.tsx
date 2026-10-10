"use client";

import { TrackedCtaLink } from "@/components/interactive/tracked-cta-link";
import { trackEvent } from "@/lib/analytics";
import { getCommercialCta } from "@/lib/config/commercial";
import { setIntent, type IntentSituation } from "@/lib/intent";
import { Fragment } from "react";

// Each situation goes to its one next step: a new build or a replacement is
// estimated first, a live site goes to maintenance, "not sure" to the audit.
const INTENT_ROUTES: Record<IntentSituation, { href: string; ctaKey: string }> = {
  "new-build": { href: getCommercialCta("projectRange").href, ctaKey: "projectRange" },
  "replace-existing": { href: getCommercialCta("projectRange").href, ctaKey: "projectRange" },
  "improve-existing": { href: "/services/maintenance", ctaKey: "maintenanceService" },
  unsure: { href: getCommercialCta("technicalAudit").href, ctaKey: "technicalAudit" },
};

const SITUATIONS = Object.keys(INTENT_ROUTES) as IntentSituation[];

const LINK =
  "min-h-6 rounded-ctl-sm whitespace-nowrap text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors duration-(--motion-drawer) ease-smooth outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11";

/**
 * One line of four situation links. A click stores the situation (sent with
 * any later lead) and reports `intent_selected`; navigation is never held.
 */
export function IntentLinks({
  question,
  labels,
  source,
  className,
}: {
  question: string;
  labels: Partial<Record<IntentSituation, string>>;
  source: string;
  className?: string;
}) {
  return (
    <p className={className}>
      <span>{question}</span>{" "}
      {SITUATIONS.filter((situation) => labels[situation]).map((situation, index) => (
        <Fragment key={situation}>
          {index > 0 && <span aria-hidden> · </span>}
          <TrackedCtaLink
            href={INTENT_ROUTES[situation].href}
            ctaKey={INTENT_ROUTES[situation].ctaKey}
            ctaContext={`source=${source}`}
            className={LINK}
            onClick={() => {
              setIntent(situation);
              trackEvent("intent_selected", { situation });
            }}
          >
            {labels[situation]}
          </TrackedCtaLink>
        </Fragment>
      ))}
    </p>
  );
}
