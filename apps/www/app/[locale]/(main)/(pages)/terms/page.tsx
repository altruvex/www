import { Container } from "@/components/container";
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
  const lastModified = new Date("2026-03-16");
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
        id="terms-content"
        className="pt-(--section-y-top) pb-(--section-y-bottom) py-32"
        aria-labelledby="terms-heading"
      >
        <Container className="max-w-3xl mx-auto">
          <h1
            id="terms-heading"
            className="text-4xl font-semibold text-primary tracking-tight mb-8"
          >
            {t("title")}
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-primary/70">
            <p className="text-lg text-primary/60">
              {t("lastUpdated")} {formattedDate}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.1.title")}
              </h2>
              <p>{t("sections.1.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.2.title")}
              </h2>
              <p>{t("sections.2.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.3.title")}
              </h2>
              <p>{t("sections.3.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.4.title")}
              </h2>
              <p>{t("sections.4.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.5.title")}
              </h2>
              <p>{t("sections.5.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.6.title")}
              </h2>
              <p>{t("sections.6.description")}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-medium text-primary">
                {t("sections.7.title")}
              </h2>
              <p>
                {t("sections.7.description")}
                <a
                  dir="ltr"
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand underline underline-offset-4 hover:text-brand/80 transition-colors inline-block"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}
