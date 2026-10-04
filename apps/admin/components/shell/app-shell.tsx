"use client";

import { NEW_PROPOSAL_EVENT } from "@/components/os/new-proposal-button";
import { CommandPalette } from "@/components/shell/command-palette";
import { MobileBottomBar, MobileNavDrawer } from "@/components/shell/mobile-nav";
import { ShortcutsSheet } from "@/components/shell/shortcuts";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { createShortcutsFor, gotoShortcutsFor, type BadgeKey, type Role } from "@/lib/nav";
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
  const [paletteMode, setPaletteMode] = React.useState<"search" | "proposal">("search");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const gotoArmed = React.useRef(false);
  const createArmed = React.useRef(false);
  const create = React.useMemo(
    () => new Map(createShortcutsFor(role).map((s) => [s.key, s.href])),
    [role],
  );
  const goto = React.useMemo(
    () => new Map(gotoShortcutsFor(role).map((s) => [s.key, s.href])),
    [role],
  );

  const openPalette = React.useCallback((mode: "search" | "proposal" = "search") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  React.useEffect(() => {
    const onNewProposal = () => openPalette("proposal");
    window.addEventListener(NEW_PROPOSAL_EVENT, onNewProposal);
    return () => window.removeEventListener(NEW_PROPOSAL_EVENT, onNewProposal);
  }, [openPalette]);

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
        createArmed.current = false;
        window.setTimeout(() => (gotoArmed.current = false), 1200);
        return;
      }
      if (event.key.toLowerCase() === "c" && !gotoArmed.current && !createArmed.current) {
        createArmed.current = true;
        window.setTimeout(() => (createArmed.current = false), 1200);
        return;
      }
      if (createArmed.current) {
        const target = create.get(event.key.toLowerCase());
        createArmed.current = false;
        if (target) {
          event.preventDefault();
          router.push(target);
        }
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
  }, [router, goto, create, openPalette]);

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
            role={role}
            unreadCount={unreadCount}
            onOpenPalette={() => openPalette("search")}
            onCreateProposal={() => openPalette("proposal")}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="min-w-0 flex-1 p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-4">{children}</main>
        </div>
      </div>
      <MobileBottomBar role={role} badges={badges} onOpenMore={() => setMobileNavOpen(true)} />
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
