import { Container } from "@/components/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { Calendar, Mail, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, "privacy", "/privacy");
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
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
      <JsonLd schemas={buildPageSchemas(locale, "privacy")} />
      <section
        id="privacy-header"
        className="pt-32 pb-16 bg-primary/5 border-b border-primary/10"
      >
        <Container className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-xl mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1
              id="privacy-heading"
              className="text-4xl md:text-5xl font-bold text-primary tracking-tight"
            >
              {t("title")}
            </h1>
            <div className="flex items-center gap-2 text-primary/60 mt-2 font-medium">
              <Calendar className="w-4 h-4" />
              <p>
                {t("lastUpdated")} <span className="text-primary/80">{formattedDate}</span>
              </p>
            </div>
          </div>
        </Container>
      </section>
      <section
        id="privacy-content"
        className="py-16 md:py-24"
        aria-labelledby="privacy-heading"
      >
        <Container className="max-w-4xl mx-auto">
          <div className="space-y-12 text-primary/80">
            <article className="pl-6 md:pl-8 border-l-2 border-primary/20 space-y-4">
              <h2 className="text-2xl font-semibold text-primary tracking-tight">
                {t("sections.1.title")}
              </h2>
              <p className="leading-relaxed">{t("sections.1.description")}</p>
              <ul className="list-none space-y-3 mt-4 bg-primary/5 p-6 rounded-lg">
                <li className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="text-primary min-w-[120px]">{t("sections.1.contactLabel")}</strong> 
                  <span className="text-primary/70">{t("sections.1.contactValue")}</span>
                </li>
                <li className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="text-primary min-w-[120px]">{t("sections.1.projectLabel")}</strong> 
                  <span className="text-primary/70">{t("sections.1.projectValue")}</span>
                </li>
                <li className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="text-primary min-w-[120px]">{t("sections.1.techLabel")}</strong> 
                  <span className="text-primary/70">{t("sections.1.techValue")}</span>
                </li>
              </ul>
            </article>
            <article className="pl-6 md:pl-8 border-l-2 border-primary/20 space-y-4">
              <h2 className="text-2xl font-semibold text-primary tracking-tight">
                {t("sections.2.title")}
              </h2>
              <p className="leading-relaxed">{t("sections.2.description")}</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary/40 text-primary/70">
                <li>{t("sections.2.item1")}</li>
                <li>{t("sections.2.item2")}</li>
                <li>{t("sections.2.item3")}</li>
                <li>{t("sections.2.item4")}</li>
              </ul>
            </article>
            <article className="pl-6 md:pl-8 border-l-2 border-primary/20 space-y-4">
              <h2 className="text-2xl font-semibold text-primary tracking-tight">
                {t("sections.3.title")}
              </h2>
              <p className="leading-relaxed">{t("sections.3.description")}</p>
            </article>
            <article className="pl-6 md:pl-8 border-l-2 border-primary/20 space-y-4">
              <h2 className="text-2xl font-semibold text-primary tracking-tight">
                {t("sections.4.title")}
              </h2>
              <p className="leading-relaxed">{t("sections.4.description")}</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary/40 text-primary/70">
                <li>{t("sections.4.item1")}</li>
                <li>{t("sections.4.item2")}</li>
                <li>{t("sections.4.item3")}</li>
                <li>{t("sections.4.item4")}</li>
              </ul>
            </article>
            {[5, 6, 7, 8].map((num) => (
              <article key={num} className="pl-6 md:pl-8 border-l-2 border-primary/20 space-y-4">
                <h2 className="text-2xl font-semibold text-primary tracking-tight">
                  {t(`sections.${num}.title`)}
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {t(`sections.${num}.description`)}
                </p>
              </article>
            ))}
            <article className="pl-6 md:pl-8 border-l-2 border-brand/50 space-y-4 bg-brand/5 p-6 rounded-r-xl">
              <h2 className="text-2xl font-semibold text-primary tracking-tight">
                {t("sections.9.title")}
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap">
                {t("sections.9.description")}
              </p>
              <div className="pt-2">
                <a
                  dir="ltr"
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {CONTACT_EMAIL}
                </a>
              </div>
            </article>
          </div>
        </Container>
      </section>
      
      <SectionEndCta variant="contact" />
    </>
  );
}