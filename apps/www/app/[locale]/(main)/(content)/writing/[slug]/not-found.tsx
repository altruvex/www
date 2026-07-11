"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ArticleNotFound() {
  const t = useTranslations("writing.notFound");
  const tWriting = useTranslations("writing");

  return (
    <section className="accent-world-blue flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="max-w-2xl py-32">
          <Eyebrow className="mb-4 block">{tWriting("eyebrow")}</Eyebrow>
          <h1 className="mb-4 font-sans text-[clamp(28px,4.5vw,52px)] font-normal leading-[1.05] tracking-[-0.02em] text-primary">
            {t("title")}
          </h1>
          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
          <Link
            href="/writing"
            className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:text-foreground eyebrow"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-all duration-300 ltr:group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5" />
            {tWriting("backLink")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
