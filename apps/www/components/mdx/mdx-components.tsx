import { Accent, Highlight, Strong, type AccentGradient } from "@/components/ui/emphasis";
import { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Quote } from "./quote";

function fallbackAltText(src: string) {
  const filename =
    src
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "";
  const humanized = filename.replace(/[-_]+/g, " ").trim();

  return humanized || "Article illustration";
}

/**
 * The single color accent an article earns for its one defining claim -
 * not a highlighter. Used at most once or twice per article; everything
 * else stays in Strong/Highlight so the color keeps its signal.
 */
function Mark({
  gradient = "brand",
  children,
}: {
  gradient?: AccentGradient;
  children?: React.ReactNode;
}) {
  return (
    <Accent gradient={gradient} className="font-medium">
      {children}
    </Accent>
  );
}

export const mdxComponents: MDXComponents = {
  h1: ({ children, id }) => (
    <h1
      id={id}
      className="mb-6 mt-12 font-sans font-normal text-foreground leading-[1.1] tracking-[-0.025em]"
      style={{ fontSize: "clamp(2.25rem, 4.2vw, 3.5rem)" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2
      id={id}
      className="mb-5 mt-14 font-sans font-normal text-foreground leading-[1.12] tracking-[-0.02em]"
      style={{ fontSize: "clamp(1.625rem, 3.2vw, 2.5rem)" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3
      id={id}
      className="mb-4 mt-10 font-sans font-normal text-foreground leading-[1.18] tracking-[-0.015em]"
      style={{ fontSize: "clamp(1.25rem, 2.2vw, 1.625rem)" }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-6 text-lg leading-relaxed text-primary/85">{children}</p>
  ),
  strong: ({ children }) => <Strong>{children}</Strong>,
  em: ({ children }) => <Highlight>{children}</Highlight>,
  Mark,
  ul: ({ children }) => (
    <ul className="my-6 ml-6 list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-6 ml-6 list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-relaxed text-primary/85">{children}</li>
  ),
  a: ({ href, children }) => (
    <Link
      href={href as string}
      className="transition-all text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  ),
  img: ({ src, alt, width, height }) => {
    const w = width != null ? Number(width) : 1200;
    const h = height != null ? Number(height) : 630;
    const resolvedSrc = String(src);
    const resolvedAlt =
      typeof alt === "string" && alt.trim().length > 0
        ? alt.trim()
        : fallbackAltText(resolvedSrc);
    return (
      <Image
        src={resolvedSrc}
        alt={resolvedAlt}
        width={w}
        height={h}
        sizes="(max-width: 768px) 100vw, min(896px, 75vw)"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        quality={75}
        className="my-8 h-auto w-full max-w-3xl rounded-lg"
      />
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-primary pl-6 italic text-primary/75">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm leading-normal tracking-wider text-sm">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: CodeBlock,
  Callout,
  Quote,
};
