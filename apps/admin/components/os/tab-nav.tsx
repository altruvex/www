import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Deep-linkable tabs.
 *
 * Radix Tabs would be less code, but a detail-page tab is a place an operator
 * pastes into a message ("look at the Contracts tab of this client"). Driving
 * them from a search param keeps every tab a real URL, keeps the page a server
 * component, and makes browser back work the way people expect.
 */
export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

export function TabNav({
  tabs,
  active,
  basePath,
  param = "tab",
  keep,
}: {
  tabs: TabDef[];
  active: string;
  basePath: string;
  param?: string;
  /**
   * Search params that survive a tab switch — a filter such as `?product=`
   * or `?client=` scopes every tab, so switching tabs must not drop it.
   */
  keep?: Record<string, string | undefined | null>;
}) {
  const hrefFor = (id: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keep ?? {})) if (value) params.set(key, value);
    if (id !== tabs[0].id) params.set(param, id);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav className="flex h-9 items-center gap-4 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-base",
              "transition-colors duration-[var(--dur-state)]",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
