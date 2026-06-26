import { Container } from "@/components/shared/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, "terms", "/terms");
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";
  const lastModified = new Date("2026-06-14");
  const formattedDate = lastModified.toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const CONTACT_EMAIL = "hello@altruvex.com";

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, "terms")} />
      <section
        id="terms-header"
        className="pt-32 pb-16 bg-foreground/5 border-b border-foreground/10"
      >
        <Container className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                Legal
              </p>
            </div>
            <h1
              id="terms-heading"
              className="text-4xl md:text-5xl font-bold text-foreground tracking-tight"
            >
              {t("title")}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-2 text-sm font-medium">
              <p>
                {t("lastUpdated")} <span className="text-foreground/80">{formattedDate}</span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="terms-content"
        className="py-16 md:py-24"
        aria-labelledby="terms-heading"
      >
        <Container className="max-w-4xl mx-auto">
          <div className="space-y-12 text-muted-foreground">
            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.1.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.1.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.2.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.2.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.3.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.3.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.4.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.4.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.5.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.5.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.6.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">{t("sections.6.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.7.title")}
              </h2>
              <p className="whitespace-pre-wrap">{t("sections.7.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.8.title")}
              </h2>
              <p className="whitespace-pre-wrap">{t("sections.8.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.9.title")}
              </h2>
              <p className="whitespace-pre-wrap">{t("sections.9.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.10.title")}
              </h2>
              <p className="whitespace-pre-wrap">{t("sections.10.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.11.title")}
              </h2>
              <p className="whitespace-pre-wrap">{t("sections.11.description")}</p>
            </article>

            <article className="pl-6 md:pl-8 border-l-2 border-foreground/20 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {t("sections.12.title")}
              </h2>
              <p className="whitespace-pre-wrap">
                {t("sections.12.description")}
                <a
                  dir="ltr"
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand underline underline-offset-4 hover:text-brand/80 transition-colors inline-block ml-1"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </article>
          </div>
        </Container>
      </section>
      <SectionEndCta variant="contact" />
    </>
  );
}
