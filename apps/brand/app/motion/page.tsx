import type { Metadata } from "next";
import { MotionDemo, type MotionToken } from "@/components/motion-demo";
import { PageHeader, Section } from "@/components/page";
import { editorHref } from "@/lib/repo";
import { tokensMatching } from "@/lib/tokens";

export const metadata: Metadata = { title: "Motion" };
export const dynamic = "force-dynamic";

function view(pattern: RegExp): MotionToken[] {
  const seen = new Set<string>();
  return tokensMatching(pattern)
    .filter((t) => !seen.has(t.name) && seen.add(t.name))
    .map((t) => ({ name: t.name, value: t.value, where: `${t.file.split("/").pop()}:${t.line}`, href: editorHref(t.file, t.line) }));
}

export default function MotionPage(): React.ReactElement {
  return (
    <>
      <PageHeader
        index="07 — Motion"
        title="Motion"
        lede="Every duration and ease the CSS can reach. Components take them as duration-(--motion-*) and ease-* — never a literal millisecond. GSAP reads the same values from apps/www/lib/motion/tokens.ts."
      />
      <Section
        title="Durations and eases"
        note="Play runs each one at once so their characters can be compared. Reduced motion is respected: the dots jump instead of travelling."
        sources={[{ file: "apps/www/app/globals.css", line: 39 }, { file: "apps/www/lib/motion/tokens.ts" }, { file: "apps/www/MOTION.md" }]}
      >
        <MotionDemo durations={view(/^--motion-[a-z]+$/)} eases={view(/^--ease-[a-z-]+$/)} />
      </Section>
    </>
  );
}
