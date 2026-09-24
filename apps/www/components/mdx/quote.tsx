import { Highlight, Strong } from "@/components/ui/emphasis";

interface QuoteProps {
  author: string;
  role?: string;
  children: React.ReactNode;
}

export function Quote({ author, role, children }: QuoteProps) {
  return (
    <figure className="my-8 border-s-2 border-local-accent ps-6">
      <blockquote className="mb-4">
        <Highlight className="text-xl text-foreground/80">
          {children}
        </Highlight>
      </blockquote>
      <figcaption className="font-mono text-sm leading-normal tracking-wider">
        <Strong>{author}</Strong>
        {role && <span className="text-muted-foreground">, {role}</span>}
      </figcaption>
    </figure>
  );
}
