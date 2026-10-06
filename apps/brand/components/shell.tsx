"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV } from "@/lib/nav";
import { setDark, useDark } from "@/lib/theme";

/** Pages laid out as a full-height workspace instead of a document. */
const WORKSPACES = ["/board"];

function ThemeToggle(): React.ReactElement {
  const dark = useDark();

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border-subtle text-muted-foreground transition-colors duration-(--motion-hover) hover:text-foreground hover:border-foreground/40"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const workspace = WORKSPACES.includes(pathname);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 border-b border-border-subtle bg-background lg:h-dvh lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-6 lg:py-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span data-wordmark className="text-lg font-semibold uppercase tracking-tight text-foreground">
              Altruvex
            </span>
            <span className="text-meta text-muted-foreground">Brand</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav aria-label="Sections" className="overflow-x-auto px-2 pb-3 lg:px-3 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 whitespace-nowrap rounded-ctl px-3 py-2 text-md transition-colors duration-(--motion-hover)",
                      active ? "bg-foreground/6 text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="hidden w-5 text-meta tabular-nums text-muted-foreground lg:inline">{item.index}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className={cn("min-w-0", workspace ? "p-3" : "px-4 pb-24 pt-10 sm:px-8 lg:px-14 lg:pt-16")}>{children}</main>
    </div>
  );
}
