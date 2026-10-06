import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/page";
import { Swatch } from "@/components/swatch";
import { colorGroups, gradientClasses } from "@/lib/tokens";

export const metadata: Metadata = { title: "Colour" };
export const dynamic = "force-dynamic";

/** The job each world colour does — docs/section-heading-emphasis.md. */
const WORLD_JOBS: Record<string, string> = {
  "accent-world-blue": "Brand and trust",
  "accent-world-orange": "Action and pricing",
  "accent-world-green": "Proof and live state",
  "accent-world-violet": "Interface design",
  "accent-world-cyan": "Consulting",
};

function GradientCard({ name, job }: { name: string; job?: string }): React.ReactElement {
  return (
    <li className="overflow-hidden rounded-panel-sm border border-border-subtle">
      {(["light", "inverted"] as const).map((scene) => (
        <div
          key={scene}
          data-scene={scene === "inverted" ? "inverted" : undefined}
          className={`${name} bg-background p-5 text-foreground`}
        >
          <div className="h-10 rounded-ctl-sm bg-linear-to-r from-(--grad-from) via-(--grad-via) to-(--grad-to)" />
          <p className="mt-4 bg-linear-to-r from-(--grad-from) via-(--grad-via) to-(--grad-to) bg-clip-text text-2xl font-semibold text-transparent">
            Built to last
          </p>
          <p className="mt-1 text-meta text-local-accent-text">
            {scene === "inverted" ? "Inverted scene" : "Light scene"} · local-accent-text
          </p>
        </div>
      ))}
      <div className="border-t border-border-subtle px-5 py-3">
        <code className="text-md font-medium">.{name}</code>
        {job && <p className="text-meta text-muted-foreground">{job}</p>}
      </div>
    </li>
  );
}

export default function ColorPage(): React.ReactElement {
  const groups = colorGroups();
  const gradients = gradientClasses();
  const worlds = gradients.filter((g) => g.worlds);
  const named = gradients.filter((g) => !g.worlds);

  return (
    <>
      <PageHeader
        index="02 — Colour"
        title="Colour"
        lede="Every colour token, read from the stylesheets the sites ship. Each chip shows the value this page computes right now, its contrast on the current background, and every place the token is declared. Switch the theme to read dark mode."
      />

      {groups.map((group) => (
        <Section
          key={group.id}
          title={group.title}
          note={group.note}
        >
          {group.tokens.length === 0 ? (
            <p className="text-muted-foreground">No tokens in this group.</p>
          ) : (
            <ul className="border-t border-border-subtle">
              {group.tokens.map((t) => (
                <Swatch key={t.name} name={t.name} kind={t.kind} decls={t.decls} />
              ))}
            </ul>
          )}
        </Section>
      ))}

      <Section
        title="World colours"
        note="A world is a job, not a decoration. One per section; at most two gradient headings per page. Each card shows the world in a light and an inverted scene."
        sources={[{ file: "docs/section-heading-emphasis.md" }, { file: "apps/www/app/globals.css" }]}
      >
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {worlds.map((w) => (
            <GradientCard key={w.name} name={w.name} job={WORLD_JOBS[w.name] ?? "No job recorded — give it one or remove it"} />
          ))}
        </ul>
      </Section>

      <Section
        title="Named gradients"
        note="Gradient classes outside the five worlds. Any one in use on a page should map back to a world's job."
      >
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {named.map((g) => (
            <GradientCard key={g.name} name={g.name} />
          ))}
        </ul>
      </Section>
    </>
  );
}
