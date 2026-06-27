import { Highlight, Strong } from "@/components/ui/emphasis";

interface QuoteProps {
  author: string;
  role?: string;
  children: React.ReactNode;
}

export function Quote({ author, role, children }: QuoteProps) {
  return (
    <figure className="my-8 ltr:border-l-2 rtl:border-r-2 border-local-accent ltr:pl-6 rtl:pr-6">
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
