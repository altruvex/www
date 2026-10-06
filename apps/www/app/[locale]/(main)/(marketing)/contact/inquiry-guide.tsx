"use client";

import { useSectionElement } from "@/lib/motion";
import { useTranslations } from "next-intl";

const INCLUDE = ["what", "today", "users", "deadline"] as const;

// Read before writing: the guide sits between the intro and the form. What
// happens after sending lives in the receipt only, so it is not repeated here.
export function InquiryGuide() {
  const t = useTranslations("contactPage");

  const guideRef = useSectionElement<HTMLDivElement>();

  return (
    <div
      ref={guideRef}
      role="group"
      aria-labelledby="contact-guide-heading"
      className="mt-12 grid gap-5 border-t border-border-subtle pt-6 md:mt-16 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12 md:pt-8"
    >
      <h2
        id="contact-guide-heading"
        className="eyebrow m-0 text-muted-foreground"
      >
        {t("guide.title")}
      </h2>
      <div className="max-w-176">
        <ul>
          {INCLUDE.map((key) => (
            <li
              key={key}
              className="border-b border-border-subtle py-3 text-base leading-relaxed text-foreground first:pt-0"
            >
              {t(`guide.include.${key}`)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t("guide.includeNote")}
        </p>
      </div>
    </div>
  );
}
