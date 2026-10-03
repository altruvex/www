"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { StatusPill } from "@/components/ui/badge";
import { dateTime } from "@/lib/format";
import { linkLogToIncident } from "@/app/(dashboard)/_actions/engineering";

export interface LinkedLog {
  id: string;
  level: string;
  environment: string;
  source: string | null;
  message: string;
  requestId: string | null;
  timestamp: string;
}

/**
 * The log lines an operator has attached to this incident as evidence. The
 * lines themselves are CI's record and are read-only; only the link is ours to
 * remove.
 */
export function LinkedLogs({ logs, productId }: { logs: LinkedLog[]; productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  function unlink(logId: string) {
    setBusyId(logId);
    startTransition(async () => {
      const result = await linkLogToIncident({ logId, incidentId: null });
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setBusyId(null);
    });
  }

  return (
    <ul className="divide-y divide-border">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start gap-2 px-3 py-2">
          <StatusPill registry="logLevel" value={log.level} variant="dot" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="break-words font-mono text-meta">{log.message}</p>
            <p className="mt-0.5 truncate text-meta text-subtle-foreground">
              {dateTime(log.timestamp)} · {log.environment.toLowerCase()}
              {log.source ? ` · ${log.source}` : ""}
              {log.requestId && (
                <>
                  {" · "}
                  <Link
                    href={`/logs?product=${encodeURIComponent(productId)}&requestId=${encodeURIComponent(log.requestId)}`}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    trace
                  </Link>
                </>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={pending && busyId === log.id}
            onClick={() => unlink(log.id)}
          >
            {pending && busyId === log.id ? "Unlinking…" : "Unlink"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
