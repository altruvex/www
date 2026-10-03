"use client";

import { ArrowIcon } from "@/components/shared/directional-link";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { HOMEPAGE_SUPPORTING_CASE_STUDIES } from "@/lib/config/commercial";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import { useSectionElement, useSectionEyebrow, useWordRead } from "@/lib/motion";
import { getDomainName } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { Children, memo, type ReactNode } from "react";

const [NEWLIGHT, ART_LIGHTING] = HOMEPAGE_SUPPORTING_CASE_STUDIES;
const OWN_SITE = "altruvex-site";
const BUILDS = [NEWLIGHT, ART_LIGHTING, OWN_SITE] as const;

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Text as `[data-word]` spans for useWordRead; elements pass through. */
function readWords(node: ReactNode): ReactNode {
  return Children.toArray(node).map((child, i) =>
    typeof child === "string"
      ? child.split(/(\s+)/).map((part, j) =>
          part.trim() ? (
            <span key={`${i}-${j}`} data-word>
              {part}
            </span>
          ) : (
            part
          ),
        )
      : child,
  );
}

/**
 * The work as one sentence: the three builds are named in running display
 * type and each name is the link to its case study. No list, no screenshots —
 * the detail lives on /work. Picked from docs/prototypes/2026-10-work (D).
 */
export const WorkSection = memo(function WorkSection() {
  const t = useTranslations("work");

  const eyebrowRef = useSectionEyebrow();
  const sentenceRef = useWordRead<HTMLHeadingElement>();
  const rowRef = useSectionElement();

  const buildLink = (slug: string) =>
    function BuildLink(chunks: ReactNode) {
      return (
        <Link
          href={`/work/${slug}`}
          className={`rounded-ctl-sm underline decoration-foreground/30 decoration-1 underline-offset-[0.14em] rtl:underline-offset-[0.3em] transition-colors duration-(--motion-drawer) ease-smooth hover:decoration-local-accent-text ${FOCUS_RING}`}
        >
          {readWords(chunks)}
        </Link>
      );
    };

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <Eyebrow ref={eyebrowRef}>{t("selectedWork")}</Eyebrow>
        <h2
          ref={sentenceRef}
          id="work-heading"
          className="mt-8 max-w-[24ch] text-[clamp(2rem,4.4vw,4.5rem)] leading-[1.1] font-light tracking-[-0.03em] text-foreground rtl:leading-[1.45] rtl:tracking-normal"
        >
          {readWords(
            t.rich("sentence", {
              newlight: buildLink(NEWLIGHT),
              art: buildLink(ART_LIGHTING),
              site: buildLink(OWN_SITE),
              em: (chunks) => <Highlight tone="world">{chunks}</Highlight>,
            }),
          )}
        </h2>
        <div
          ref={rowRef}
          className="mt-16 flex flex-col gap-5 border-t border-border-subtle pt-6 md:flex-row md:items-baseline md:justify-between md:gap-10"
        >
          <Eyebrow>{t("allLive")}</Eyebrow>
          <ul className="flex list-none flex-wrap gap-x-8 gap-y-2">
            {BUILDS.map((slug) => {
              const url = getCaseStudyBySlug(slug)?.externalUrl;
              return url ? (
                <li key={slug}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className={`inline-flex min-h-6 items-center gap-1.5 rounded-ctl-sm font-mono text-sm text-muted-foreground transition-colors duration-(--motion-drawer) ease-smooth hover:text-foreground pointer-coarse:min-h-11 ${FOCUS_RING}`}
                  >
                    {getDomainName(url)}
                    <span aria-hidden>↗</span>
                  </a>
                </li>
              ) : null;
            })}
          </ul>
          <Link
            href="/work"
            className={`group inline-flex min-h-6 items-center gap-2 rounded-ctl-sm text-base text-foreground transition-colors duration-(--motion-drawer) ease-smooth hover:text-local-accent-text pointer-coarse:min-h-11 ${FOCUS_RING}`}
          >
            {t("seeWork")}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
});
