import type { ReactNode } from "react";
import { Dim, Strong } from "@/components/ui/emphasis";

export const bodyMarks = {
  strong: (chunks: ReactNode) => <Strong>{chunks}</Strong>,
  dim: (chunks: ReactNode) => <Dim>{chunks}</Dim>,
} as const;

const BODY_TAG = /<(strong|dim)>(.*?)<\/\1>/g;

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
