import type { Metadata } from "next";
import { ButtonSpecimen } from "@/components/button-specimen";
import { Highlight } from "@repo/ui/www";
import { PageHeader, Section } from "@/components/page";
import { SceneFrame } from "@/components/scene-frame";
import { SizeLadder } from "@/components/size-ladder";
import { heroCopy, navCopy, type HeroCopy } from "@/lib/copy";

export const metadata: Metadata = { title: "Hierarchy" };
export const dynamic = "force-dynamic";

const EMPHASIS = "docs/section-heading-emphasis.md";

/** The world-gradient clause, as <Accent gradient="world"> renders it (packages/ui/src/www/emphasis.tsx). */
function WorldAccent({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span
      data-accent-grad=""
      className="accent-world inline-block bg-linear-to-r from-(--grad-from) via-(--grad-via) to-(--grad-to) bg-clip-text text-transparent rtl:bg-linear-to-l"
    >
      {children}
    </span>
  );
}

function Composed({ copy, cta, more }: { copy: HeroCopy; cta: string; more: string }): React.ReactElement {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow mb-6 text-muted-foreground">{copy.badge}</p>
      <h2>
        {copy.title_line1} <Highlight tone="soft">{copy.title_line2}</Highlight>
      </h2>
      <p className="mt-6 max-w-[58ch] text-muted-foreground">{copy.sub}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonSpecimen variant="primary">{cta}</ButtonSpecimen>
        <ButtonSpecimen variant="secondary">{more}</ButtonSpecimen>
      </div>
    </div>
  );
}

const TREATMENTS = [
  {
    name: "Gradient",
    when: "The clause is what the client gets: an outcome, proof, a live thing, a price they can trust, an invitation to act.",
    limit: "At most 2 per page (homepage and /services excepted). Never two of the same world back to back. Never on an inverted island.",
    sample: (c: HeroCopy) => (
      <>
        {c.title_line1} <WorldAccent>{c.title_line2}</WorldAccent>
      </>
    ),
  },
  {
    name: "Dimmed italic",
    when: "The clause is how we think or work, an identity claim, or any warning, loss or “not”.",
    limit: "Display headings take tone soft; muted is for text-size titles; surface on inverted islands. Bold upright in Arabic.",
    sample: (c: HeroCopy) => (
      <>
        {c.title_line1} <Highlight tone="soft">{c.title_line2}</Highlight>
      </>
    ),
  },
  {
    name: "Plain",
    when: "The heading is a label or a description; no second clause is worth a voice change.",
    limit: "Body copy never takes Gradient or Italic — only Strong and Dim.",
    sample: (c: HeroCopy) => (
      <>
        {c.title_line1} {c.title_line2}
      </>
    ),
  },
];

export default function HierarchyPage(): React.ReactElement {
  const en = heroCopy("en");
  const ar = heroCopy("ar");
  const navEn = navCopy("en");
  const navAr = navCopy("ar");

  return (
    <>
      <PageHeader
        index="04 — Hierarchy"
        title="Hierarchy"
        lede="How a section speaks: eyebrow, heading with at most one emphasised clause, body, then the action. Switch the scene, the world and the direction to see the same block the way it sits on each part of the site."
      />

      <Section
        title="A composed section"
        note="Eyebrow → heading → body → action, and nothing between them competes. The primary action is the only filled shape."
      >
        <SceneFrame rtl={<Composed copy={ar} cta={navAr.getStarted ?? ""} more={navAr.schedule ?? ""} />}>
          <Composed copy={en} cta={navEn.getStarted ?? ""} more={navEn.schedule ?? ""} />
        </SceneFrame>
      </Section>

      <Section
        title="Size ladder"
        note="Every step as computed at this width, and its ratio to the step below. A ratio under ×1.08 is flagged: two levels that close stop reading as two levels."
      >
        <SizeLadder />
      </Section>

      <Section
        title="Heading emphasis"
        note="Every headline has at most one emphasised clause, and it takes exactly one of three treatments."
        sources={[{ file: EMPHASIS, line: 6 }]}
      >
        <ul className="grid gap-4 lg:grid-cols-3">
          {TREATMENTS.map((t) => (
            <li key={t.name} className="accent-world-blue rounded-panel-sm border border-border-subtle p-6">
              <p className="eyebrow mb-4 text-muted-foreground">{t.name}</p>
              <h3>{t.sample(en)}</h3>
              <p className="mt-5 text-md">{t.when}</p>
              <p className="mt-2 text-md text-muted-foreground">{t.limit}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
