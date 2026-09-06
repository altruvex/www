"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileBottomBar, MobileNavDrawer } from "@/components/shell/mobile-nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { ShortcutsSheet } from "@/components/shell/shortcuts";
import type { BadgeKey, Role } from "@/lib/nav";

/**
 * The application shell. Owns exactly three pieces of client state — sidebar
 * collapse, palette open, mobile drawer open — and the global key handler.
 *
 * Everything else in the app is a server component. Keeping the shell thin is
 * what lets a route like /clients render on the server and still feel instant.
 */
const GOTO: Record<string, string> = {
  d: "/",
  i: "/inbox",
  l: "/leads",
  c: "/clients",
  p: "/proposals",
  k: "/pipeline",
  o: "/projects",
  n: "/contracts",
  m: "/calendar",
  y: "/payments",
  a: "/analytics",
  s: "/settings",
};

export function AppShell({
  user,
  role,
  badges,
  unreadCount,
  children,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null };
  role?: Role;
  badges: Partial<Record<BadgeKey, number>>;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const gotoArmed = React.useRef(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("avx.sidebar.collapsed");
    // Client-only preference store; see the note in components/os/data-table.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "1") setCollapsed(true);
    const density = window.localStorage.getItem("avx.density");
    if (density === "compact" || density === "relaxed") {
      document.documentElement.dataset.density = density;
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      window.localStorage.setItem("avx.sidebar.collapsed", c ? "0" : "1");
      return !c;
    });
  }

  React.useEffect(() => {
    function isTyping(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      // ⌘K / Ctrl+K works even inside a field — it is the universal escape hatch.
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key === "[") {
        event.preventDefault();
        toggleCollapse();
        return;
      }
      // Two-key "go to" chords, the Linear/Gmail idiom: g then d.
      if (event.key.toLowerCase() === "g") {
        gotoArmed.current = true;
        window.setTimeout(() => (gotoArmed.current = false), 1200);
        return;
      }
      if (gotoArmed.current) {
        const target = GOTO[event.key.toLowerCase()];
        gotoArmed.current = false;
        if (target) {
          event.preventDefault();
          router.push(target);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex min-h-dvh">
        <div className="sticky top-0 hidden h-dvh shrink-0 border-e border-sidebar-border lg:block">
          <Sidebar
            role={role}
            badges={badges}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            unreadCount={unreadCount}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="min-w-0 flex-1 p-3 pb-20 sm:p-4 lg:pb-4">{children}</main>
        </div>
      </div>

      <MobileBottomBar badges={badges} onOpenMore={() => setMobileNavOpen(true)} />
      <MobileNavDrawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        role={role}
        badges={badges}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </TooltipProvider>
  );
}
