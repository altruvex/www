import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/page";
import { Probe } from "@/components/probe";

export const metadata: Metadata = { title: "Elevation & glass" };

const SHADOWS = [
  { cls: "shadow-card", use: "Resting card" },
  { cls: "shadow-card-lg", use: "Lifted card, popover" },
  { cls: "shadow-(--elev-1)", use: "Hairline lift" },
  { cls: "shadow-(--elev-2)", use: "Menu, floating control" },
] as const;

const GLASS = [
  { cls: "liquid-glass", use: "Popovers and toasts" },
  { cls: "liquid-glass-flat", use: "The site nav bar: glass without depth" },
  { cls: "liquid-glass-panel", use: "Sticky readouts and caption panels over content" },
  { cls: "liquid-glass-clear", use: "Overlays over content (clear glass B)" },
  { cls: "liquid-glass-clear-dense", use: "Clear glass where text needs more fill" },
  { cls: "liquid-glass-nav", use: "Header with a bottom hairline" },
  { cls: "liquid-glass-toolbar", use: "Floating control bars (admin selection dock)" },
] as const;

export default function ElevationPage(): React.ReactElement {
  return (
    <>
      <PageHeader
        index="06 — Elevation & glass"
        title="Elevation & glass"
        lede="Depth is quiet: two card shadows, two lifts, and the glass family. Glass sits on a layer above content, never as a text treatment. Switch the theme — every shadow has a dark-mode value."
      />

      <Section
        title="Shadows"
        note="A card is an edge first. Shadow is added only when something actually sits above the page."
        sources={[{ file: "packages/ui/src/styles/tokens.css", line: 188 }]}
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SHADOWS.map((s) => (
            <Probe key={s.cls} label={s.cls} reads={["shadow"]}>
              <span className={`${s.cls} block h-32 w-full rounded-panel-sm border border-border-subtle bg-card`} />
            </Probe>
          ))}
        </div>
        <ul className="mt-6 grid gap-1 text-md text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {SHADOWS.map((s) => (
            <li key={s.cls}>{s.use}</li>
          ))}
        </ul>
      </Section>

      <Section
        title="Glass"
        note="Each surface sits over the same world gradient so the blur and fill can be compared side by side."
        sources={[{ file: "packages/ui/src/styles/liquid-glass.css", line: 8 }]}
      >
        <div className="accent-world-blue relative overflow-hidden rounded-panel-md">
          <div aria-hidden className="absolute inset-0 bg-linear-to-br from-(--grad-from) via-(--grad-via) to-(--grad-to)" />
          <div aria-hidden className="absolute inset-y-0 start-1/3 w-24 bg-foreground/60" />
          <ul className="relative grid gap-5 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {GLASS.map((g) => (
              <li key={g.cls} className={`${g.cls} rounded-panel-sm p-5`}>
                <code className="text-md font-medium">.{g.cls}</code>
                <p className="mt-2 text-meta">{g.use}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
