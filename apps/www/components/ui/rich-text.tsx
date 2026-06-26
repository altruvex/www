import type { ReactNode } from "react";

import { Dim, Strong } from "@/components/ui/emphasis";

/**
 * Tag handlers for body-copy emphasis via next-intl `t.rich(key, bodyMarks)`.
 *
 * Body copy gets ONLY `<strong>` (core claim) and `<dim>` (trailing/secondary
 * clause). Color (`<accent>`) and the serif-italic `<highlight>` idiom are
 * reserved for headlines - keeping them out of this map enforces that doctrine
 * structurally: a body string can't accidentally pull in a headline treatment.
 *
 * Any message string that contains these tags MUST be rendered with `t.rich`
 * and this map - a plain `t()` call would print the tags as literal text.
 */
export const bodyMarks = {
  strong: (chunks: ReactNode) => <Strong>{chunks}</Strong>,
  dim: (chunks: ReactNode) => <Dim>{chunks}</Dim>,
} as const;

const BODY_TAG = /<(strong|dim)>(.*?)<\/\1>/g;

/**
 * Parses `<strong>`/`<dim>` tags out of a raw string (e.g. one paragraph of a
 * `t.raw()` value that's been split on "\n\n") and renders them with the same
 * primitives as `bodyMarks`. Use this only where `t.rich` can't reach the
 * string directly - the source key has already been split into pieces.
 */
export function renderBodyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  BODY_TAG.lastIndex = 0;
  while ((match = BODY_TAG.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, tag, content] = match;
    nodes.push(
      tag === "strong" ? (
        <Strong key={key++}>{content}</Strong>
      ) : (
        <Dim key={key++}>{content}</Dim>
      ),
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
