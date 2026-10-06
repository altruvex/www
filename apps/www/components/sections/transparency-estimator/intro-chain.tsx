"use client";

import { DirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@repo/ui/www";
import { cn } from "@/lib/utils/utils";
import type { Translator } from "./types";

const STAGES = ["pricing", "estimate", "proposal"] as const;

export function IntroChain({ t }: { t: Translator }) {
  return (
    <nav aria-label={t("intro.chainLabel")} className="mt-10 lg:mt-12">
      <ol className="grid list-none gap-px border-y border-border-subtle bg-border-subtle sm:grid-cols-3">
        {STAGES.map((stage) => {
          const current = stage === "estimate";

          return (
            <li
              key={stage}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex flex-col gap-2 px-5 py-5 sm:px-6",
                current ? "bg-surface/70" : "bg-background",
              )}
            >
              <Eyebrow
                tone={current ? "accent" : undefined}
                className="text-micro leading-none"
              >
                {t(`intro.${stage}.name`)}
              </Eyebrow>
              <span className="text-base font-medium leading-snug text-foreground">
                {t(`intro.${stage}.answer`)}
              </span>
              <span className="mt-1 inline-flex w-fit rounded-full border border-border-subtle px-3 py-1 text-xs text-muted-foreground">
                {t(`intro.${stage}.tag`)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
        <DirectionalLink
          href="/pricing"
          className="min-h-11 transition-colors ease-smooth hover:text-foreground"
        >
          {t("intro.pricingLink")}
        </DirectionalLink>
        <DirectionalLink
          href="/pricing#terms"
          className="min-h-11 transition-colors ease-smooth hover:text-foreground"
        >
          {t("intro.termsLink")}
        </DirectionalLink>
      </p>
    </nav>
  );
}
