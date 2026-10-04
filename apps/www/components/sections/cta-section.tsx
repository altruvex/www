"use client";
import { useTranslations } from "next-intl";
import { SectionEndCta } from "./section-end-cta";

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
      primary="technicalCall"
      secondary="projectRange"
    />
  );
}
