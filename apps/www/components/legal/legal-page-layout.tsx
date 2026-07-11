"use client";

import { PageHero } from "@/components/sections/page-hero";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Container } from "@/components/shared/container";
import { LegalProse } from "@/components/legal/legal-prose";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

type LegalNamespace = "privacy" | "terms";

type LegalPageLayoutProps = {
  namespace: LegalNamespace;
  formattedDate: string;
  accentClass?: string;
  children: ReactNode;
};

export function LegalPageLayout({
  namespace,
  formattedDate,
  accentClass = "accent-world-blue",
  children,
}: LegalPageLayoutProps) {
  const t = useTranslations(namespace);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("title")}
        description={t("hero.description")}
        minHeightClass="min-h-[70vh]"
        className={accentClass}
      >
        <p className="text-sm leading-normal text-primary/40">
          {t("lastUpdated")}{" "}
          <span className="font-sans text-primary/70 normal-case tracking-normal">
            {formattedDate}
          </span>
        </p>
      </PageHero>

      <section
        className={cn(
          accentClass,
          "border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)",
        )}
      >
        <Container>
          <div>{children}</div>
        </Container>
      </section>

      <SectionEndCta variant="contact" />
    </div>
  );
}

function stripSectionPrefix(title: string) {
  return title.replace(/^[\d٠-٩]+\.\s*/, "").trim();
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  const locale = useLocale();

  return (
    <article className="grid items-start gap-8 border-b border-foreground/8 py-10 md:grid-cols-[56px_1fr] md:py-12">
      <span className="pt-2 text-sm leading-normal text-foreground/20">
        {localizeNumbers(String(number).padStart(2, "0"), locale)}
      </span>
      <div className="max-w-4xl">
        <h2
          className="mb-4 font-sans font-normal leading-[1.05] text-primary"
          style={{
            fontSize: "clamp(28px, 4.5vw, 52px)",
            letterSpacing: "-0.02em",
          }}
        >
          {stripSectionPrefix(title)}
        </h2>
        {children}
      </div>
    </article>
  );
}

export function LegalContactSection({
  title,
  description,
  email,
}: {
  title: string;
  description: string;
  email: string;
}) {
  const tContact = useTranslations("contact");

  return (
    <article className="mt-4 rounded-lg border border-foreground/8 bg-foreground/2 p-6 md:p-8">
      <h2
        className="mb-4 font-sans font-normal leading-[1.05] text-primary"
        style={{
          fontSize: "clamp(24px, 3.5vw, 36px)",
          letterSpacing: "-0.02em",
        }}
      >
        {stripSectionPrefix(title)}
      </h2>
      <LegalProse content={description} />
      <a
        dir="ltr"
        href={`mailto:${email}`}
        className="group mt-8 block"
      >
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-primary/60" />
          <span className="text-sm leading-normal text-primary/60">
            {tContact("email")}
          </span>
        </div>
        <p className="text-lg text-primary transition-all group-hover:text-primary/75 md:text-xl">
          {email}
        </p>
      </a>
    </article>
  );
}
