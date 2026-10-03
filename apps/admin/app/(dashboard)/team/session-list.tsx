"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MonitorSmartphone } from "lucide-react";

import { Button, LoadingIcon } from "@repo/ui";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";

import { revokeAllSessions, revokeSession } from "@/app/(dashboard)/_actions/team";
import { dateTime, when } from "@/lib/format";

/**
 * One signed-in browser, as the page may show it. The server strips the
 * session token before this leaves the request: a token is a login, and the
 * screen only needs to know which row is the browser you are reading it in.
 */
export interface SessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  current: boolean;
}

/** "Chrome on macOS" from a user-agent string, or the raw string when unsure. */
export function describeAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (!browser && !os) return userAgent.length > 60 ? `${userAgent.slice(0, 60)}…` : userAgent;
  return [browser, os].filter(Boolean).join(" on ");
}

export function SessionList({
  sessions,
  canRevoke,
  emptyText = "No active sessions.",
}: {
  sessions: SessionRow[];
  /** Whether the viewer may end these sessions (their own, or with the team capability). */
  canRevoke: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function end(session: SessionRow) {
    setPendingId(session.id);
    revokeSession(session.id)
      .then((result) => {
        if (result.ok) toast.success(result.message ?? "Session ended.");
        else toast.error(result.message);
        router.refresh();
      })
      .finally(() => setPendingId(null));
  }

  if (sessions.length === 0) {
    return <p className="px-3 py-6 text-center text-meta text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-start gap-3 px-3 py-2.5">
          <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-base font-medium">
              <span className="truncate">{describeAgent(session.userAgent)}</span>
              {session.current && <span className="telemetry shrink-0 text-success">this browser</span>}
            </p>
            <p className="truncate font-mono text-micro text-subtle-foreground">
              {session.ipAddress ?? "no ip"} · signed in {when(session.createdAt)} · last seen{" "}
              {when(session.updatedAt)} · expires {dateTime(session.expiresAt)}
            </p>
            {session.userAgent && (
              <p className="mt-0.5 truncate text-micro text-subtle-foreground" title={session.userAgent}>
                {session.userAgent}
              </p>
            )}
          </div>
          {canRevoke && (
            <Button
              variant="destructive-ghost"
              size="sm"
              disabled={session.current || pendingId !== null}
              title={session.current ? "Sign out to end this one" : undefined}
              onClick={() => end(session)}
            >
              {pendingId === session.id && <LoadingIcon size="sm" />}
              End
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Ends every listed session but the current one, with the server deciding what that means. */
export function EndAllSessionsButton({
  userId,
  count,
  own,
}: {
  userId: string;
  /** Sessions that would be ended; the button is disabled at zero. */
  count: number;
  own: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function endAll() {
    startTransition(async () => {
      const result = await revokeAllSessions(userId);
      if (result.ok) toast.success(result.message ?? "Sessions ended.");
      else toast.error(result.message);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending || count === 0} onClick={endAll}>
      {pending && <LoadingIcon size="sm" />}
      {own ? "End all other sessions" : "End all sessions"}
    </Button>
  );
}

/** A member's sessions behind a button, for the team list. */
export function MemberSessions({
  userId,
  label,
  sessions,
  canRevoke,
  own,
}: {
  userId: string;
  label: string;
  sessions: SessionRow[];
  canRevoke: boolean;
  own: boolean;
}) {
  const revocable = sessions.filter((s) => !s.current).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="font-mono text-micro text-subtle-foreground">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Sessions — {label}</SheetTitle>
          <SheetDescription>
            Every browser this account is signed in from. Ending one signs that browser out at its
            next request; each ending is written to the audit log.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="p-0">
          <SessionList sessions={sessions} canRevoke={canRevoke} />
        </SheetBody>
        {canRevoke && sessions.length > 0 && (
          <SheetFooter>
            <EndAllSessionsButton userId={userId} count={revocable} own={own} />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
