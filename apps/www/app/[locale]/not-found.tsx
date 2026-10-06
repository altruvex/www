"use client";

import { Container } from "@/components/shared/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow, Highlight } from "@repo/ui/www";
import { COMMAND_PALETTE_EVENT } from "@/components/interactive/command-palette-event";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { useTranslations } from "next-intl";

const POPULAR = [
  { href: "/services", key: "services" },
  { href: "/work", key: "work" },
  { href: "/pricing", key: "pricing" },
  { href: getCommercialCta("projectRange").href, key: "transparency" },
  { href: "/writing", key: "writing" },
] as const;

const linkClass =
  "inline-flex min-h-8 items-center text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors duration-(--motion-instant) hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-ctl-xs pointer-coarse:min-h-11";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const tCTAs = useTranslations("commercial.ctas");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      {/* Client component: no metadata export, so React hoists this into <head>. */}
      <title>{`${t("titleLine1")} ${t("titleLine2").replace(/\.$/, "")} | Altruvex`}</title>
      <div
        aria-hidden
        className="pointer-events-none select-none absolute bottom-0 end-0 font-sans font-semibold leading-none"
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
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-relaxed text-muted-foreground mb-10 max-w-md">
            {t("body")}
          </p>
          <nav aria-labelledby="not-found-popular" className="mb-12">
            <h2 id="not-found-popular" className="eyebrow mb-3.5 text-muted-foreground">
              {t("popularLabel")}
            </h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {POPULAR.map(({ href, key }) => (
                <li key={key}>
                  <Link href={href} className={linkClass}>
                    {key === "writing" ? tFooter("writing") : tNav(key)}
                    {key === "transparency" && (
                      <span className="ms-1.5 text-muted-foreground">
                        · {tNav("transparencyHint")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT))}
                className={linkClass + " cursor-pointer"}
              >
                {t("search")}
              </button>{" "}
              <span>{t("searchHint")}</span>
            </p>
          </nav>
          <div className="flex flex-col sm:flex-row gap-4">
            <MagneticButton asChild size="lg" variant="primary">
              <Link href="/">{t("goHome")}</Link>
            </MagneticButton>
            <MagneticButton asChild size="lg" variant="secondary">
              <Link href={getCommercialCta("describeTheBuild").href}>{tCTAs("describeTheBuild")}</Link>
            </MagneticButton>
          </div>
        </main>
      </Container>
    </div>
  );
}
