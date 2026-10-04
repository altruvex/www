"use client";

import { useRouter } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";

import { Button, Hint } from "@repo/ui";
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
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { dateTime, when } from "@/lib/format";

export interface SessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  current: boolean;
}

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
  canRevoke: boolean;
  emptyText?: string;
}) {
  const router = useRouter();

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
          {canRevoke &&
            (session.current ? (
              <Hint label="Sign out to end this one">
                <span className="inline-flex">
                  <Button variant="destructive-ghost" size="sm" disabled aria-disabled>
                    End
                  </Button>
                </span>
              </Hint>
            ) : (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive-ghost" size="sm">
                    End
                  </Button>
                }
                title="End this session?"
                body={`${describeAgent(session.userAgent)}${session.ipAddress ? ` from ${session.ipAddress}` : ""}, last seen ${when(session.updatedAt)}.`}
                consequence="That browser is signed out at its next request and has to sign in again. The ending is written to the audit log."
                confirmLabel="End session"
                tone="danger"
                onConfirm={async () => {
                  const result = await revokeSession(session.id);
                  if (result.ok) router.refresh();
                  return result;
                }}
              />
            ))}
        </li>
      ))}
    </ul>
  );
}

export function EndAllSessionsButton({
  userId,
  count,
  own,
}: {
  userId: string;
  count: number;
  own: boolean;
}) {
  const router = useRouter();
  const label = own ? "End all other sessions" : "End all sessions";

  if (count === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        {label}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          {label}
        </Button>
      }
      title={own ? "End all other sessions?" : "End all sessions?"}
      body={`${count} signed-in browser${count === 1 ? "" : "s"}${own ? " besides this one" : ""}.`}
      consequence={
        own
          ? "Every other browser is signed out at its next request. This one stays signed in. Each ending is written to the audit log."
          : "Every browser this account is signed in from is signed out at its next request; they have to sign in again. Each ending is written to the audit log."
      }
      confirmLabel={label}
      tone="danger"
      onConfirm={async () => {
        const result = await revokeAllSessions(userId);
        if (result.ok) router.refresh();
        return result;
      }}
    />
  );
}

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
