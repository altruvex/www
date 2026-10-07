import {
  Accent,
  Highlight,
  Strong,
  type AccentGradient,
} from "@repo/ui/www/emphasis";
import { MDXComponents } from "mdx/types";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getCommercialCta, type CommercialCtaKey } from "@/lib/config/commercial";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Compare, Row } from "./compare";
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

function Mark({
  gradient = "brand",
  children,
}: {
  gradient?: AccentGradient;
  children?: React.ReactNode;
}) {
  return (
    <Accent
      gradient={gradient}
      className="body-accent from-(--grad-body-from) via-(--grad-body-via) to-(--grad-body-to) font-medium"
    >
      {children}
    </Accent>
  );
}

const LINK_CLASS =
  "text-primary underline decoration-foreground/30 underline-offset-4 transition-[text-decoration-color] duration-(--motion-hover) hover:decoration-current";

// A conversion link inside an article: the href comes from the commercial CTA
// registry, never typed into the MDX, so a moved destination moves here too.
function CtaLink({
  cta,
  children,
}: {
  cta: CommercialCtaKey;
  children?: React.ReactNode;
}) {
  return (
    <Link href={getCommercialCta(cta).href} className={LINK_CLASS}>
      {children}
    </Link>
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
    <ul className="my-6 ms-6 list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-6 ms-6 list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-relaxed text-primary/85">{children}</li>
  ),
  // Internal paths go through the locale-aware Link so an Arabic article's
  // "/pricing" resolves to "/ar/pricing"; anything else is an external source.
  a: ({ href, children }) => {
    const target = String(href ?? "");
    const className = LINK_CLASS;
    if (target.startsWith("/")) {
      return (
        <Link href={target} className={className}>
          {children}
        </Link>
      );
    }
    if (target.startsWith("#")) {
      return (
        <a href={target} className={className}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  },
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
        className="my-8 h-auto w-full max-w-3xl rounded-panel-sm"
      />
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-s-2 border-primary ps-6 text-primary/75">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          dir="ltr"
          className="rounded-ctl-xs bg-muted px-1.5 py-0.5 text-sm leading-normal tracking-wider text-sm"
        >
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: CodeBlock,
  Callout,
  Compare,
  CtaLink,
  Quote,
  Row,
};
