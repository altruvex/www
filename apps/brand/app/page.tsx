import Link from "next/link";
import { PageHeader } from "@/components/page";
import { runAudit, type Category, type Severity } from "@/lib/audit";
import { NAV } from "@/lib/nav";

export const dynamic = "force-dynamic";

const ABOUT: Record<string, string> = {
  "/logo": "The wordmarks and the icon tile as they ship, the app icons, and the brand imagery.",
  "/color": "Every colour token by role, read live in light, dark and inverted scenes, with contrast.",
  "/type": "The type scale measured in the browser, its declared source, Arabic, and the tracking ladder.",
  "/hierarchy": "A composed block in every scene and world, the size ladder, and the emphasis treatments.",
  "/edges": "Edge roles, control radii by height, panel radii by role, the pill, and border strength.",
  "/elevation": "The shadow tokens and the liquid-glass surfaces over a brand field.",
  "/motion": "Duration and easing tokens, played side by side.",
  "/board": "Every shared component and repeated pattern, live, with its states and when to use it.",
  "/audit": "Every place in www, admin and ui that leaves the rules above, with the line and the fix.",
};

/** Which reference page explains each audit category. */
const CATEGORY_PAGE: Record<Category, string> = {
  color: "/color",
  radius: "/edges",
  border: "/edges",
  typography: "/type",
  hierarchy: "/hierarchy",
  motion: "/motion",
  logo: "/logo",
  image: "/logo",
  rtl: "/type",
  reuse: "/board",
};

const SEVERITY_TONE: Record<Severity, string> = {
  error: "text-danger",
  warn: "text-warning",
  info: "text-muted-foreground",
};

export default async function Overview(): Promise<React.ReactElement> {
  const report = await runAudit();
  const severityOf = new Map(report.rules.map((r) => [r.id, r.severity]));
  const categoryOf = new Map(report.rules.map((r) => [r.id, r.category]));

  const perPage = new Map<string, Record<Severity, number>>();
  for (const f of report.findings) {
    const category = categoryOf.get(f.ruleId);
    const severity = severityOf.get(f.ruleId);
    if (!category || !severity) continue;
    const page = CATEGORY_PAGE[category];
    const counts = perPage.get(page) ?? { error: 0, warn: 0, info: 0 };
    counts[severity] += 1;
    perPage.set(page, counts);
  }
  const total = (s: Severity): number => report.findings.filter((f) => severityOf.get(f.ruleId) === s).length;

  return (
    <>
      <PageHeader
        index="00 — Overview"
        title="The Altruvex identity, as it ships"
        lede="Every value here is read from the live token files, not copied. When a token changes in the source, this app changes with it. The audit reads the source the same way and lists what drifts."
      />

      <Link
        href="/audit"
        className="mb-16 grid gap-6 rounded-panel-sm border border-border-subtle p-6 transition-colors duration-(--motion-hover) hover:border-foreground/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:mb-24"
      >
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">Drift right now</p>
          <p className="text-md text-muted-foreground">
            {report.scanned.map((s) => `${s.app} ${s.files} files`).join(" · ")}
          </p>
        </div>
        <dl className="flex gap-8">
          {(["error", "warn", "info"] as Severity[]).map((s) => (
            <div key={s}>
              <dt className="text-meta text-muted-foreground">{s}</dt>
              <dd className={`text-4xl font-semibold tabular-nums ${SEVERITY_TONE[s]}`}>{total(s)}</dd>
            </div>
          ))}
        </dl>
      </Link>

      <ul className="grid gap-px overflow-hidden rounded-panel-sm border border-border-subtle bg-border-subtle sm:grid-cols-2">
        {NAV.filter((n) => n.href !== "/").map((n) => {
          const counts = perPage.get(n.href);
          return (
            <li key={n.href} className="bg-background">
              <Link
                href={n.href}
                className="flex h-full flex-col gap-3 p-6 transition-colors duration-(--motion-hover) hover:bg-foreground/4"
              >
                <span className="text-meta tabular-nums text-muted-foreground">{n.index}</span>
                <span className="text-xl font-semibold">{n.label}</span>
                <span className="text-md text-muted-foreground">{ABOUT[n.href]}</span>
                {counts && n.href !== "/audit" && (
                  <span className="mt-auto text-meta text-muted-foreground">
                    Drift in this area:{" "}
                    {(["error", "warn", "info"] as Severity[])
                      .filter((s) => counts[s] > 0)
                      .map((s) => `${counts[s]} ${s}`)
                      .join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
