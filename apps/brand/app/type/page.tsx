import type { Metadata } from "next";
import { Highlight } from "@repo/ui/www";
import { Measured } from "@/components/measured";
import { PageHeader, Section, SourceLink } from "@/components/page";
import { heroCopy } from "@/lib/copy";
import { contextLabel, ruleDecls } from "@/lib/css-source";
import { tokensMatching } from "@/lib/tokens";

export const metadata: Metadata = { title: "Typography" };
export const dynamic = "force-dynamic";

const WWW = "apps/www/app/globals.css";

function Declared({ selector }: { selector: string }): React.ReactElement | null {
  const decls = ruleDecls(selector).filter((d) => !d.property.startsWith("--"));
  if (decls.length === 0) return null;
  return (
    <details className="mt-4 text-meta text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">Declared for {selector}</summary>
      <ul className="mt-2 space-y-1">
        {decls.map((d) => (
          <li key={`${d.file}:${d.line}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <span className="truncate">
              <span className="text-foreground/70">{contextLabel(d.context)}</span> · {d.property}: {d.value}
            </span>
            <SourceLink file={d.file} line={d.line} />
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function TypePage(): React.ReactElement {
  const en = heroCopy("en");
  const ar = heroCopy("ar");
  const ladder = tokensMatching(/^--track-\d+-\d+$/);
  const sizes = [...new Set(ladder.map((t) => t.name.split("-")[3]))];
  const weights = [...new Set(ladder.map((t) => t.name.split("-")[4]))];
  const value = (size: string, weight: string): string =>
    ladder.find((t) => t.name === `--track-${size}-${weight}`)?.value ?? "—";

  return (
    <>
      <PageHeader
        index="03 — Typography"
        title="Typography"
        lede="One family, Altruvex Sans, for every word in both apps — Latin and Arabic faces, no mono. Each specimen below is the element the site renders, and the figures beside it are what the browser computed, at this width."
      />

      <Section
        title="The scale"
        note="Heading sizes are fluid clamps; resize the window and the figures move. Tracking comes from the size × weight ladder, never a hand-typed em."
        sources={[{ file: WWW }]}
      >
        <Measured label="h1 — page title">
          <h1>
            {en.title_line1} <Highlight>{en.title_line2}</Highlight>
          </h1>
        </Measured>
        <Declared selector="h1" />
        <Measured label="h2 — section title">
          <h2>{en.title_line1} {en.title_line2}</h2>
        </Measured>
        <Declared selector="h2" />
        <Measured label=".section-title">
          <p className="section-title">{en.title_line1} {en.title_line2}</p>
        </Measured>
        <Declared selector=".section-title" />
        <Measured label="h3 — block title">
          <h3>{en.title_line1} {en.title_line2}</h3>
        </Measured>
        <Declared selector="h3" />
        <Measured label="h4 — item title">
          <h4>{en.title_line1} {en.title_line2}</h4>
        </Measured>
        <Declared selector="h4" />
        <Measured label=".eyebrow">
          <p className="eyebrow text-muted-foreground">{en.badge}</p>
        </Measured>
        <Declared selector=".eyebrow" />
        <Measured label="Body — p">
          <p className="max-w-[62ch]">{en.sub}</p>
        </Measured>
        <Measured label="text-md">
          <p className="text-md">{en.sub}</p>
        </Measured>
        <Measured label="text-meta">
          <p className="text-meta">{en.sub}</p>
        </Measured>
        <Measured label="text-micro">
          <p className="text-micro">{en.sub}</p>
        </Measured>
      </Section>

      <Section
        title="Arabic"
        note="Arabic never takes Latin tracking, and it reads at a taller line-height. Heading emphasis turns upright and bold in RTL — italic is not an Arabic convention."
        sources={[{ file: WWW }]}
      >
        <div dir="rtl" lang="ar">
          <Measured label="h1 · ar">
            <h1>
              {ar.title_line1} <Highlight>{ar.title_line2}</Highlight>
            </h1>
          </Measured>
          <Measured label="h2 · ar">
            <h2>{ar.title_line1} {ar.title_line2}</h2>
          </Measured>
          <Measured label=".eyebrow · ar">
            <p className="eyebrow text-muted-foreground">{ar.badge}</p>
          </Measured>
          <Measured label="Body · ar">
            <p className="max-w-[62ch]">{ar.sub}</p>
          </Measured>
        </div>
      </Section>

      <Section
        title="Tracking ladder"
        note="Pick the row for the smallest size the text reaches and the column for its weight. Anything else — tracking-tight, tracking-[-0.03em] — is drift."
        sources={[{ file: "packages/brand-font/dist/web/tokens.css" }]}
      >
        <div className="overflow-x-auto rounded-panel-sm border border-border-subtle">
          <table className="w-full text-md tabular-nums">
            <thead>
              <tr className="border-b border-border-subtle text-start text-meta text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">From size</th>
                {weights.map((w) => (
                  <th key={w} className="px-4 py-3 text-start font-medium">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s} className="border-b border-border-subtle last:border-b-0">
                  <th className="px-4 py-3 text-start font-medium">{s}px</th>
                  {weights.map((w) => (
                    <td key={w} className="px-4 py-3 text-muted-foreground">
                      {value(s, w)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
