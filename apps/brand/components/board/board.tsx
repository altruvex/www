"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Toaster } from "@repo/ui";
import type { SourceKey } from "@/lib/board-sources";
import { cn } from "@/lib/cn";
import { ButtonsWidget, LinksWidget } from "./actions";
import { Customizer, type Scene } from "./customizer";
import { ActivityWidget, LedgerWidget, LoadingWidget, ProgressWidget, StatusWidget, TeamWidget } from "./data";
import {
  EdgesWidget,
  ElevationWidget,
  LogoWidget,
  SurfacesWidget,
  TypeWidget,
  WORLDS,
  WorldsWidget,
  type World,
} from "./foundations";
import { ContactWidget, NoteWidget, NotificationsWidget, ScheduleWidget, SetupWidget } from "./inputs";
import { InventoryWidget, type InventoryGroup } from "./inventory";
import { BoardProvider, type Direction } from "./kit";
import { DrawerWidget, FaqWidget, ProposalWidget } from "./overlays";
import { HeadingWidget, PlannedWidget, PlanWidget } from "./patterns";
import { SiteDrawerWidget, SiteFormWidget } from "./site";

/**
 * The component board: the system's components composed into small, believable widgets on
 * one wide canvas, with a settings panel beside it. The canvas opens centred, pans by
 * dragging its background, and re-renders every widget in Arabic, in the inverted scene, in
 * another colour world, or with its usage notes and source links.
 */
export function Board({
  hrefs,
  groups,
}: {
  hrefs: Record<SourceKey, string>;
  groups: InventoryGroup[];
}): React.ReactElement {
  const [dir, setDir] = useState<Direction>("ltr");
  const [scene, setScene] = useState<Scene>("page");
  const [world, setWorld] = useState<World>("blue");
  const [notes, setNotes] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const centre = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // Open on the wide centre column: centred when it fits, its start edge in view when it does not.
  useLayoutEffect(() => {
    const el = canvas.current;
    const col = centre.current;
    if (!el || !col) return;
    const start = col.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    el.scrollLeft = start - Math.max(24, (el.clientWidth - col.offsetWidth) / 2);
  }, []);

  function reset(): void {
    setDir("ltr");
    setScene("page");
    setWorld("blue");
    setNotes(false);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    if (e.button !== 0 || e.pointerType === "touch") return;
    // Portalled overlays (menus, dialogs) bubble here through React but live outside the canvas.
    if (!(e.target instanceof Element) || !e.currentTarget.contains(e.target)) return;
    if (e.target.closest("figure")) return;
    const el = e.currentTarget;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    const start = drag.current;
    if (!start) return;
    const el = e.currentTarget;
    el.scrollLeft = start.left - (e.clientX - start.x);
    el.scrollTop = start.top - (e.clientY - start.y);
  }

  function onPointerUp(): void {
    drag.current = null;
  }

  return (
    <BoardProvider value={{ dir, notes, hrefs }}>
      <div className="flex flex-col gap-3 lg:h-[calc(100dvh-1.5rem)] lg:flex-row">
        <Customizer
          dir={dir}
          onDir={setDir}
          scene={scene}
          onScene={setScene}
          world={world}
          onWorld={setWorld}
          notes={notes}
          onNotes={setNotes}
          onReset={reset}
        />
        <div
          ref={canvas}
          id="board"
          dir="ltr"
          data-lenis-prevent
          data-scene={scene === "inverted" ? "inverted" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            WORLDS.find((w) => w.id === world)?.cls,
            "h-[75dvh] min-h-0 min-w-0 flex-1 cursor-grab overflow-auto overscroll-contain rounded-panel-lg border border-border-subtle bg-surface text-foreground active:cursor-grabbing lg:h-auto [&_figure]:cursor-auto",
          )}
        >
          <div className="grid w-max grid-cols-[repeat(9,22.5rem)] items-start gap-10 p-10">
            <div className="flex flex-col gap-10">
              <InventoryWidget groups={groups} />
            </div>
            <div className="flex flex-col gap-10">
              <ProgressWidget />
              <ContactWidget />
              <LogoWidget />
              <SurfacesWidget />
            </div>
            <div className="flex flex-col gap-10">
              <NotificationsWidget />
              <ActivityWidget />
              <StatusWidget />
              <ScheduleWidget />
            </div>
            <div ref={centre} className="col-span-2 flex flex-col gap-10">
              <HeadingWidget />
              <LedgerWidget />
              <ButtonsWidget />
              <div className="grid grid-cols-2 items-start gap-10">
                <EdgesWidget />
                <ElevationWidget />
              </div>
              <LoadingWidget />
            </div>
            <div className="flex flex-col gap-10">
              <PlanWidget />
              <SetupWidget />
              <FaqWidget />
              <DrawerWidget />
            </div>
            <div className="flex flex-col gap-10">
              <WorldsWidget world={world} onWorld={setWorld} />
              <TypeWidget />
              <ProposalWidget />
            </div>
            <div className="flex flex-col gap-10">
              <NoteWidget />
              <TeamWidget />
              <PlannedWidget />
              <LinksWidget />
            </div>
            <div className="flex flex-col gap-10">
              <SiteFormWidget />
              <SiteDrawerWidget />
            </div>
          </div>
        </div>
      </div>
      <Toaster dir={dir} />
    </BoardProvider>
  );
}
