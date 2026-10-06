import { editorHref } from "@/lib/repo";

export function PageHeader({
  index,
  title,
  lede,
}: {
  index: string;
  title: string;
  lede: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="mb-16 max-w-4xl lg:mb-24">
      <p className="eyebrow mb-6 text-muted-foreground">{index}</p>
      <h1>{title}</h1>
      <p className="mt-6 max-w-[62ch] text-muted-foreground">{lede}</p>
    </header>
  );
}

export function Section({
  title,
  note,
  sources,
  children,
}: {
  title: string;
  note?: React.ReactNode;
  sources?: { file: string; line?: number }[];
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="mb-20 lg:mb-28">
      <div className="mb-8 grid gap-4 border-t border-border-subtle pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
        <h2 className="text-balance">{title}</h2>
        <div className="space-y-3 text-md text-muted-foreground">
          {note && <p>{note}</p>}
          {sources && sources.length > 0 && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-meta">
              <span>Source</span>
              {sources.map((s) => (
                <SourceLink key={s.file + (s.line ?? "")} file={s.file} line={s.line} />
              ))}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SourceLink({ file, line }: { file: string; line?: number }): React.ReactElement {
  return (
    <a
      href={editorHref(file, line ?? 1)}
      className="text-foreground/80 underline decoration-border-mid underline-offset-2 hover:decoration-foreground"
    >
      {file}
      {line ? `:${line}` : ""}
    </a>
  );
}

/** A plain-language observation the page makes about the live identity. Never a ruling. */
export function Finding({ tone = "warn", children }: { tone?: "warn" | "info"; children: React.ReactNode }): React.ReactElement {
  return (
    <p
      className={
        tone === "warn"
          ? "border-s-2 border-warning ps-4 text-md text-foreground"
          : "border-s-2 border-border-strong ps-4 text-md text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}
