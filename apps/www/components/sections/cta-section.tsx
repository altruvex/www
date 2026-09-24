"use client";
import { useTranslations } from "next-intl";
import { SectionEndCta } from "./section-end-cta";

/**
 * The homepage's close: the shared end-of-page structure at display size, with
 * the founder-direct call as its one primary.
 */
export function CtaSection() {
  const t = useTranslations("commercial.cta");

  return (
    <SectionEndCta
      id="cta"
      ariaLabel={t("sectionAriaLabel")}
      size="display"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      footnote={t("footnote")}
      primary="technicalCall"
      secondary="projectRange"
    />
  );
}
