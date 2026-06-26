"use client";

import { Container } from "@/components/shared/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Highlight } from "@/components/ui/emphasis";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <div
        aria-hidden
        className="pointer-events-none select-none absolute bottom-0 ltr:right-0 rtl:left-0 font-sans font-semibold leading-none"
        style={{
          fontSize: "clamp(120px, 22vw, 340px)",
          letterSpacing: "-0.06em",
          color: "color-mix(in srgb, hsl(var(--foreground)) 3%, transparent)",
          lineHeight: 0.85,
        }}
      >
        404
      </div>
      <Container>
        <main className="relative z-10 max-w-2xl">
          <Eyebrow className="mb-6 block">{t("eyebrow")}</Eyebrow>
          <h1
            className="mb-8 font-sans font-normal text-primary leading-[1.05]"
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              letterSpacing: "-0.025em",
            }}
          >
            {t("titleLine1")}
            <br />
            <Highlight className="text-primary/70">{t("titleLine2")}</Highlight>
          </h1>
          <div className="h-px w-24 bg-foreground/8 mb-8" />
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground mb-12 max-w-md">
            {t("body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <MagneticButton asChild size="lg" variant="primary">
              <Link href="/">{t("goHome")}</Link>
            </MagneticButton>
            <MagneticButton asChild size="lg" variant="secondary">
              <Link href="/contact">{t("contactUs")}</Link>
            </MagneticButton>
          </div>
        </main>
      </Container>
    </div>
  );
}
