import type { Metadata } from "next";
import { ButtonSpecimen } from "@/components/button-specimen";
import { PageHeader, Section } from "@/components/page";
import { Probe } from "@/components/probe";

export const metadata: Metadata = { title: "Borders & radius" };

const EDGE_DOC = "docs/edge-system-2026-09.md";
const WWW = "apps/www/app/globals.css";

/** Control radii are keyed by the control's measured height. Class names are literal for Tailwind. */
const CONTROLS = [
  { cls: "rounded-ctl-xs", h: "h-6", use: "≤ 24px tall: chips, kbd, tiny toggles" },
  { cls: "rounded-ctl-sm", h: "h-8", use: "control-h-sm (32px)" },
  { cls: "rounded-ctl", h: "h-10", use: "control-h (40px): inputs, selects" },
  { cls: "rounded-ctl-lg", h: "h-11", use: "control-h-lg (44px)" },
  { cls: "rounded-ctl-xl", h: "h-12", use: "control-h-xl (48px)" },
] as const;

/** Container radii are keyed by role, never by size or importance. */
const PANELS = [
  { cls: "rounded-panel-sm", use: "Cards, list items, small containers" },
  { cls: "rounded-panel-md", use: "Sections inside a page, feature blocks" },
  { cls: "rounded-panel-lg", use: "Stages: the hero stage, full-bleed panels" },
  { cls: "rounded-overlay", use: "Dialogs, sheets, menus" },
] as const;

const BORDERS = [
  { cls: "border-border-subtle", use: "Container edge (role A), separators, grid lines" },
  { cls: "border-border", use: "Default border" },
  { cls: "border-border-mid", use: "Never a control's only edge" },
  { cls: "border-border-strong", use: "Emphasised separator" },
  { cls: "border-foreground/45", use: "A control's edge when it has nothing else" },
] as const;

export default function EdgesPage(): React.ReactElement {
  return (
    <>
      <PageHeader
        index="05 — Borders & radius"
        title="Borders & radius"
        lede="Two radius families that never mix: controls by height, containers by role. Three edge roles. One named exception. Every figure below is measured from the rendered box."
      />

      <Section
        title="Edge roles"
        note="Every edge on the site is one of these three, or the ledger-head-rule."
        sources={[{ file: EDGE_DOC, line: 7 }]}
      >
        <div className="grid gap-6 lg:grid-cols-4">
          <figure>
            <div className="h-36 rounded-panel-sm border border-border-subtle p-5 text-md">Container</div>
            <figcaption className="mt-3 text-md">
              <strong className="font-medium">A · Container</strong>
              <span className="block text-muted-foreground">Hairline border-border-subtle and a panel radius chosen by role.</span>
            </figcaption>
          </figure>
          <figure>
            <div className="flex h-36 flex-col justify-center gap-4 text-md">
              <span>First item</span>
              <span className="border-t border-border-subtle pt-4">Second item</span>
            </div>
            <figcaption className="mt-3 text-md">
              <strong className="font-medium">B · Separator</strong>
              <span className="block text-muted-foreground">One side only. Never carries a radius.</span>
            </figcaption>
          </figure>
          <figure>
            <div className="grid h-36 grid-cols-2 overflow-hidden rounded-panel-sm border border-border-subtle text-md">
              {["01", "02", "03", "04"].map((n, i) => (
                <span
                  key={n}
                  className={`p-4 ${i % 2 === 0 ? "border-e border-border-subtle" : ""} ${i < 2 ? "border-b border-border-subtle" : ""}`}
                >
                  {n}
                </span>
              ))}
            </div>
            <figcaption className="mt-3 text-md">
              <strong className="font-medium">C · Grid</strong>
              <span className="block text-muted-foreground">Outer border and panel radius; inner hairlines, zero inner radius. Tabular data only.</span>
            </figcaption>
          </figure>
          <figure>
            <div className="h-36 text-md">
              <div className="border-t-2 border-foreground pt-4 font-medium">Register</div>
              <div className="border-b border-border-subtle py-3 text-muted-foreground">Row</div>
              <div className="py-3 text-muted-foreground">Row</div>
            </div>
            <figcaption className="mt-3 text-md">
              <strong className="font-medium">Ledger-head-rule</strong>
              <span className="block text-muted-foreground">border-t-2 border-foreground. Only the rule that opens a register; never thinned, never emphasis.</span>
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section
        title="Control radii — by height"
        note="Measure the control, then take its row. A bigger or more important control does not earn a bigger radius."
        sources={[{ file: WWW, line: 22 }, { file: "packages/ui/src/styles/tokens.css", line: 78 }]}
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {CONTROLS.map((c) => (
            <Probe key={c.cls} label={c.cls} reads={["radius", "height"]}>
              <span className={`${c.cls} ${c.h} block w-full border border-foreground/45 bg-surface`} />
            </Probe>
          ))}
        </div>
        <ul className="mt-6 grid gap-1 text-md text-muted-foreground sm:grid-cols-2 lg:grid-cols-5">
          {CONTROLS.map((c) => (
            <li key={c.cls}>{c.use}</li>
          ))}
        </ul>
      </Section>

      <Section
        title="Container radii — by role"
        note="panel-inset is for a box nested inside a panel-sm, so the inner and outer curves stay concentric."
        sources={[{ file: WWW, line: 24 }]}
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PANELS.map((p) => (
            <Probe key={p.cls} label={p.cls} reads={["radius"]}>
              <span className={`${p.cls} block h-28 w-full border border-border-subtle bg-surface`} />
            </Probe>
          ))}
        </div>
        <ul className="mt-6 grid gap-1 text-md text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {PANELS.map((p) => (
            <li key={p.cls}>{p.use}</li>
          ))}
        </ul>
        <div className="mt-10 max-w-md rounded-panel-sm border border-border-subtle p-4">
          <Probe label="rounded-panel-inset inside rounded-panel-sm" reads={["radius"]}>
            <span className="block h-20 w-full rounded-panel-inset bg-foreground/8" />
          </Probe>
        </div>
      </Section>

      <Section
        title="The pill"
        note="rounded-full belongs to buttons (E6), badges, tags, dots, toggles and round icon buttons. Every other control keeps a ctl radius."
        sources={[{ file: EDGE_DOC, line: 25 }, { file: "apps/www/components/magnetic-button.tsx", line: 126 }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonSpecimen variant="primary">primary</ButtonSpecimen>
          <ButtonSpecimen variant="secondary">secondary</ButtonSpecimen>
          <ButtonSpecimen variant="filled">filled</ButtonSpecimen>
          <ButtonSpecimen variant="ghost">ghost</ButtonSpecimen>
          <span className="accent-world-orange">
            <ButtonSpecimen variant="accent">accent</ButtonSpecimen>
          </span>
          <span className="rounded-full border border-border-subtle px-3 py-1 text-meta">badge</span>
        </div>
      </Section>

      <Section
        title="Border strength"
        note="Contrast of each edge against the page background, measured. A control needs 3:1 on its edge when the edge is all it has."
        sources={[{ file: "packages/ui/src/styles/tokens.css" }]}
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {BORDERS.map((b) => (
            <Probe key={b.cls} label={b.cls} reads={["border-contrast"]}>
              <span className={`${b.cls} block h-16 w-full rounded-ctl border-2`} />
            </Probe>
          ))}
        </div>
        <ul className="mt-6 grid gap-1 text-md text-muted-foreground sm:grid-cols-2 lg:grid-cols-5">
          {BORDERS.map((b) => (
            <li key={b.cls}>{b.use}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}
