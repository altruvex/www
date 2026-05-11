interface QuoteProps {
  author: string;
  role?: string;
  children: React.ReactNode;
}

export function Quote({ author, role, children }: QuoteProps) {
  return (
    <figure className="my-8 ltr:border-l-4 rtl:border-r-4 border-primary ltr:pl-6 rtl:pr-6">
      <blockquote className="mb-4 text-xl italic text-primary/75">
        {children}
      </blockquote>
      <figcaption className="text-sm">
        <span className="font-semibold text-primary">{author}</span>
        {role && <span className="text-primary/60">, {role}</span>}
      </figcaption>
    </figure>
  );
}
