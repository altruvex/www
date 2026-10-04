"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { List, ListRow } from "@/components/os/list-row";
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

export function LinkedLogs({
  logs,
  incidentId,
  canEdit,
}: {
  logs: LinkedLog[];
  incidentId: string;
  canEdit: boolean;
}) {
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
    <List label="Linked log lines">
      {logs.map((log) => {
        const busy = pending && busyId === log.id;
        return (
          <ListRow
            key={log.id}
            href={`/logs?incident=${encodeURIComponent(incidentId)}&inspect=${encodeURIComponent(log.id)}`}
            title={<span className="font-mono">{log.message}</span>}
            meta={[
              dateTime(log.timestamp),
              log.environment.toLowerCase(),
              log.source,
              log.requestId ? `request ${log.requestId}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={
              <StatusPill registry="logLevel" value={log.level} variant="dot" />
            }
            actions={
              canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="pointer-coarse:min-h-11"
                  disabled={busy}
                  onClick={() => unlink(log.id)}
                  aria-label={`Unlink this ${log.level} line from the incident`}
                >
                  {busy ? "Unlinking…" : "Unlink"}
                </Button>
              ) : undefined
            }
          />
        );
      })}
    </List>
  );
}
