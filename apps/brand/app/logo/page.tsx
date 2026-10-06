import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { AltruvexLogo, AltruvexWordmark } from "@repo/ui";
import { Finding, PageHeader, Section } from "@/components/page";
import { repoRoot } from "@/lib/repo";

export const metadata: Metadata = { title: "Logo" };
export const dynamic = "force-dynamic";

const LOGO = "packages/ui/src/components/brand/altruvex-logo.tsx";
const FOOTER = "apps/www/components/layout/footer.tsx";

/* Both marks are the shared components themselves: AltruvexLogo in the header, AltruvexWordmark in the footer. */
const SIZES = ["xs", "sm", "md", "lg"] as const;

const APP_ICONS = ["favicon-96x96.png", "apple-touch-icon.png", "web-app-manifest-192x192.png", "web-app-manifest-512x512.png"];

function images(dir: string): string[] {
  try {
    return readdirSync(join(repoRoot(), "apps/www/public", dir)).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
  } catch {
    return [];
  }
}

function Plate({ label, source, children, dark }: { label: string; source: string; children: React.ReactNode; dark?: boolean }): React.ReactElement {
  return (
    <figure className="overflow-hidden rounded-panel-sm border border-border-subtle">
      <div
        data-scene={dark ? "inverted" : undefined}
        className="flex min-h-48 items-center justify-center gap-8 bg-background p-8 text-foreground"
      >
        {children}
      </div>
      <figcaption className="border-t border-border-subtle px-5 py-3 text-md">
        <span className="font-medium">{label}</span>
        <span className="block text-meta text-muted-foreground">{source}</span>
      </figcaption>
    </figure>
  );
}

export default function LogoPage(): React.ReactElement {
  const mood = images("brand/mood");
  const branding = images("brand/branding");

  return (
    <>
      <PageHeader
        index="01 — Logo"
        title="Logo"
        lede="Altruvex has no drawn logo yet — no vector file exists. What the site shows is the name set in Altruvex Sans, in more than one way. This page puts every version side by side so the differences can be decided once."
      />

      <Section
        title="Wordmark, as it ships"
        note="The shared AltruvexLogo (www header, admin shell, portal, signing page) and the footer wordmark, in the light and the inverted scene."
        sources={[{ file: LOGO }, { file: LOGO, line: 68 }, { file: FOOTER, line: 232 }]}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[false, true].map((dark) => (
            <Plate key={String(dark)} label="AltruvexLogo full — xs / sm / md / lg" source="uppercase · semibold · tracking-tight" dark={dark}>
              {SIZES.map((s) => (
                <AltruvexLogo key={s} size={s} variant="full" />
              ))}
            </Plate>
          ))}
          {[false, true].map((dark) => (
            <Plate key={`f${dark}`} label="Footer — fitted wordmark" source="mixed case · bold · -0.05em" dark={dark}>
              <AltruvexWordmark className="text-7xl leading-[0.74]" />
            </Plate>
          ))}
        </div>
      </Section>

      <Section title="Tile and lockup" note="The ink “A” tile, alone and before the wordmark. Admin shows the lockup at xs; the collapsed sidebar shows the tile." sources={[{ file: LOGO, line: 29 }]}>
        <div className="grid gap-4 lg:grid-cols-2">
          {[false, true].map((dark) => (
            <Plate key={String(dark)} label="AltruvexLogo icon — xs / sm / md / lg" source="bg-foreground · rounded-ctl-xs at every size" dark={dark}>
              {SIZES.map((s) => (
                <AltruvexLogo key={s} size={s} variant="icon" />
              ))}
            </Plate>
          ))}
          {[false, true].map((dark) => (
            <Plate key={`l${dark}`} label="AltruvexLogo lockup — xs / md" source="tile · gap-2 · wordmark" dark={dark}>
              <AltruvexLogo size="xs" variant="lockup" />
              <AltruvexLogo size="md" variant="lockup" />
            </Plate>
          ))}
        </div>
      </Section>

      <Section title="App icons" note="The files browsers and phones show for the site, served straight from apps/www/public." sources={[{ file: "apps/www/public/favicon.svg" }]}>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {APP_ICONS.map((f) => (
            <li key={f} className="overflow-hidden rounded-panel-sm border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- a specimen of the raw file, not a content image */}
              <img src={`/www-asset/${f}`} alt={`${f} as shipped`} className="aspect-square w-full bg-n-0 object-contain" />
              <p className="border-t border-border-subtle px-4 py-2 text-meta text-muted-foreground">{f}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Where the identity splits" note="Observations, not rulings — each needs one decision from you.">
        <div className="max-w-3xl space-y-4">
          <Finding>
            Three wordmarks: the shared mark (www header and every admin surface) sets the name in capitals at semibold, the footer in mixed case at bold with tighter tracking, and the app icons in a serif face that exists nowhere else in the system.
          </Finding>
          <Finding>
            The app icons are a wordmark on white, so at 16–32px they read as a grey smudge, and they do not change with dark mode. favicon.svg only wraps a PNG.
          </Finding>
          <Finding tone="info">
            No vector logo exists. Until one is drawn, the wordmark in Altruvex Sans is the logo, and every surface should set it one way.
          </Finding>
        </div>
      </Section>

      <Section
        title="Brand imagery"
        note="Mood, not product: surfaces, light and material in the brand blue. These are the photos the site is allowed to use as atmosphere."
        sources={[{ file: "apps/www/public/brand/README.md" }]}
      >
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...mood.map((f) => `brand/mood/${f}`), ...branding.map((f) => `brand/branding/${f}`)].map((p) => (
            <li key={p} className="overflow-hidden rounded-panel-sm border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- a specimen of the raw file */}
              <img src={`/www-asset/${p}`} alt="" loading="lazy" className="aspect-4/5 w-full object-cover" />
              <p className="truncate border-t border-border-subtle px-4 py-2 text-meta text-muted-foreground">{p}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
