import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import { Container } from "../shared/container";
import { Eyebrow } from "../ui/eyebrow";

type MeasureSection = {
  body: string;
  points: string[];
  title: string;
};

/**
 * How the estimate works — editorial reference column.
 *
 * Proof shape: sequence — what the estimator measures, why the range moves,
 * then how to act on the result. The order is the argument, so the section is
 * numbered and runs as one column rather than three parallel boxes.
 *
 * Device: a quiet reference column. This is the only section on the page whose
 * job is to be *read* rather than to perform — it sits under a live calculator
 * and must not compete with it. The bordered 3-card grid it replaces did
 * compete, and it was the site's over-subscribed device besides.
 */
export function TransparencyMeasuresDetailsSection() {
  const t = useTranslations("transparency.seo");
  const locale = useLocale();
  const sections = t.raw("sections") as MeasureSection[];

  return (
    <section
      aria-labelledby="transparency-measures-heading"
      className="border-t border-border bg-background pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="max-w-[62ch]">
          <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
          <h2
            id="transparency-measures-heading"
            className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.02em] text-foreground"
          >
            {t("title")}
          </h2>
          <p className="mt-6 text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
        </div>

        <ol className="mt-14 list-none border-b border-border md:mt-16">
          {sections.map((section, index) => (
            <li
              key={section.title}
              className="grid gap-x-12 gap-y-5 border-t border-border py-9 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:py-11"
            >
              <div className="flex items-baseline gap-4 md:block">
                <span
                  aria-hidden
                  className="shrink-0 text-sm tabular-nums text-muted-foreground ltr:font-mono"
                >
                  {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
                </span>
                <h3 className="text-[clamp(1.125rem,1.5vw,1.375rem)] font-medium leading-snug text-foreground md:mt-3">
                  {section.title}
                </h3>
              </div>

              <div>
                <p className="max-w-[58ch] text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
                <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 h-px w-3.5 shrink-0 bg-local-accent/60"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
