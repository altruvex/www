"use client";

import { CommandPalette } from "@/components/shell/command-palette";
import { MobileBottomBar, MobileNavDrawer } from "@/components/shell/mobile-nav";
import { ShortcutsSheet } from "@/components/shell/shortcuts";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { gotoShortcutsFor, type BadgeKey, type Role } from "@/lib/nav";
import { TooltipProvider } from "@repo/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

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
  // "proposal" turns the palette into a client picker: a proposal is always
  // written for a client, so creating one starts by choosing who it is for.
  const [paletteMode, setPaletteMode] = React.useState<"search" | "proposal">("search");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const gotoArmed = React.useRef(false);
  const goto = React.useMemo(
    () => new Map(gotoShortcutsFor(role).map((s) => [s.key, s.href])),
    [role],
  );

  const openPalette = React.useCallback((mode: "search" | "proposal" = "search") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("avx.sidebar.collapsed");
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
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteMode("search");
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        openPalette("search");
        return;
      }
      // The only `?` handler — the sheet itself does not listen, so one press
      // cannot open and close it in the same tick.
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }
      if (event.key === "[") {
        event.preventDefault();
        toggleCollapse();
        return;
      }
      if (event.key.toLowerCase() === "g") {
        gotoArmed.current = true;
        window.setTimeout(() => (gotoArmed.current = false), 1200);
        return;
      }
      if (gotoArmed.current) {
        const target = goto.get(event.key.toLowerCase());
        gotoArmed.current = false;
        if (target) {
          event.preventDefault();
          router.push(target);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, goto, openPalette]);

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
            onOpenPalette={() => openPalette("search")}
            onCreateProposal={() => openPalette("proposal")}
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
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        mode={paletteMode}
        onModeChange={setPaletteMode}
        role={role}
      />
      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} role={role} />
    </TooltipProvider>
  );
}
