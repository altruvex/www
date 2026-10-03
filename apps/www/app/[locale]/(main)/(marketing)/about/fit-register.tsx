"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useSectionElement, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";

/**
 * Who the studio is for, and who it is not for, as a two-column register
 * opened by the ledger-head-rule. The "not a fit" column is struck through
 * but kept at muted-foreground, so it stays readable: it is still copy a
 * visitor is meant to read about themselves.
 */
export function FitRegisterSection() {
  const t = useTranslations("about.fit");
  const fit: string[] = t.raw("fitItems");
  const notFit: string[] = t.raw("notItems");

  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const registerRef = useSectionElement<HTMLDivElement>();

  return (
    <section
      aria-labelledby="about-fit-heading"
      className="pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleId="about-fit-heading"
          titleRef={titleRef}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[18ch]" }}
        />

        <div
          ref={registerRef}
          className="mt-10 grid border-t-2 border-foreground md:grid-cols-2 lg:mt-14"
        >
          <FitColumn label={t("fitLabel")} items={fit} />
          <FitColumn label={t("notLabel")} items={notFit} struck />
        </div>
      </Container>
    </section>
  );
}

function FitColumn({
  label,
  items,
  struck = false,
}: {
  label: string;
  items: string[];
  struck?: boolean;
}) {
  return (
    <div
      className={cn(
        "pt-6 md:pt-8",
        struck
          ? "mt-10 border-t border-border-subtle md:mt-0 md:border-t-0 md:border-s md:ps-10 lg:ps-12"
          : "md:pe-10 lg:pe-12",
      )}
    >
      <Eyebrow className="m-0">{label}</Eyebrow>
      <ul className="mt-5">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "border-b border-border-subtle py-4 text-[clamp(1.25rem,1.9vw,1.625rem)] font-light leading-[1.3] tracking-[-0.015em] rtl:leading-[1.6] rtl:tracking-normal",
              struck
                ? "text-muted-foreground line-through decoration-1"
                : "text-foreground",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
