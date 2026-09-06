"use client";

import { DataTable, type Column } from "@/components/os/data-table";
import { ToneBadge } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import {
  Button, Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@repo/ui";
import {
  ArrowRight,
  Eye
} from "lucide-react";
import * as React from "react";

export type AuditAction = "CREATE" | "UPDATE" | "STATUS_CHANGE" | "DELETE" | "SIGN" | "SEND" | "AUTH";

export interface AuditRecord {
  id: string;
  entityType: "Contract" | "Proposal" | "Client" | "Payment" | "Settings" | "User" | "Session";
  entityId: string;
  entityName: string;
  action: AuditAction;
  actorName: string;
  actorRole: string;
  actorIp: string;
  fieldName?: string;
  previousValue?: string | null;
  newValue?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const ACTION_TONES: Record<AuditAction, "neutral" | "info" | "progress" | "warning" | "danger" | "success"> = {
  CREATE: "info",
  UPDATE: "progress",
  STATUS_CHANGE: "warning",
  DELETE: "danger",
  SIGN: "success",
  SEND: "info",
  AUTH: "neutral",
};

export function AuditClient({
  initialRecords,
}: {
  initialRecords: AuditRecord[];
}) {
  const [records] = React.useState<AuditRecord[]>(initialRecords);
  const [selectedRecord, setSelectedRecord] = React.useState<AuditRecord | null>(null);
  const [selectedEntity, setSelectedEntity] = React.useState<string>("all");
  const [selectedAction, setSelectedAction] = React.useState<string>("all");

  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (selectedEntity !== "all" && r.entityType !== selectedEntity) return false;
      if (selectedAction !== "all" && r.action !== selectedAction) return false;
      return true;
    });
  }, [records, selectedEntity, selectedAction]);

  const columns: Column<AuditRecord>[] = [
    {
      id: "entity",
      header: "Target Entity",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.entityName}</span>
          <span className="block font-mono text-micro text-subtle-foreground">
            {row.entityType} #{row.entityId.slice(0, 8)}
          </span>
        </span>
      ),
      sortValue: (row) => row.entityName,
      searchValue: (row) => `${row.entityName} ${row.entityType} ${row.entityId}`,
    },
    {
      id: "action",
      header: "Action",
      width: "140px",
      cell: (row) => (
        <ToneBadge tone={ACTION_TONES[row.action]}>
          {row.action.replace(/_/g, " ").toLowerCase()}
        </ToneBadge>
      ),
      sortValue: (row) => row.action,
      searchValue: (row) => row.action,
    },
    {
      id: "change",
      header: "Mutation Summary",
      cell: (row) => {
        if (!row.fieldName) {
          return <span className="text-muted-foreground text-meta font-mono">Record action</span>;
        }
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-meta max-w-[280px] truncate">
            <span className="text-muted-foreground font-semibold">{row.fieldName}:</span>
            {row.previousValue && (
              <span className="line-through text-danger/80 truncate max-w-[90px]">{row.previousValue}</span>
            )}
            {row.previousValue && <ArrowRight className="size-2.5 text-muted-foreground shrink-0" />}
            <span className="text-success font-medium truncate max-w-[110px]">{row.newValue ?? "none"}</span>
          </span>
        );
      },
    },
    {
      id: "actor",
      header: "Actor",
      width: "150px",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate text-meta font-medium text-foreground">{row.actorName}</span>
          <span className="block font-mono text-micro text-subtle-foreground">{row.actorIp}</span>
        </span>
      ),
      sortValue: (row) => row.actorName,
      searchValue: (row) => `${row.actorName} ${row.actorIp}`,
    },
    {
      id: "timestamp",
      header: "Timestamp",
      width: "140px",
      mono: true,
      cell: (row) => (
        <span className="text-subtle-foreground text-meta" title={dateTime(row.timestamp)}>
          {when(row.timestamp)}
        </span>
      ),
      sortValue: (row) => new Date(row.timestamp).getTime(),
    },
    {
      id: "inspect",
      header: "",
      width: "60px",
      align: "end",
      cell: (row) => (
        <Button
          variant="outline"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRecord(row);
          }}
          aria-label={`Inspect ${row.entityType} mutation`}
        >
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
          <SelectTrigger aria-label="Filter by entity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities ({records.length})</SelectItem>
            <SelectItem value="Contract">Contracts</SelectItem>
            <SelectItem value="Proposal">Proposals</SelectItem>
            <SelectItem value="Client">Clients</SelectItem>
            <SelectItem value="Payment">Payments</SelectItem>
            <SelectItem value="Settings">Settings</SelectItem>
            <SelectItem value="Session">Security / Sessions</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger aria-label="Filter by action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
            <SelectItem value="SIGN">Sign</SelectItem>
            <SelectItem value="SEND">Send</SelectItem>
            <SelectItem value="AUTH">Authentication</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <DataTable
        tableId="audit-log"
        rows={filteredRecords}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search audit log by entity, actor, or ID…"
        initialSort={{ columnId: "timestamp", dir: "desc" }}
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No audit mutations found.</div>}
      />

      {/* Inspecting one mutation is contextual: the log stays behind the panel. */}
      <Sheet open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <SheetContent width="lg" aria-describedby={undefined}>
          {selectedRecord && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>Mutation #{selectedRecord.id.slice(0, 8)}</SheetTitle>
                  <ToneBadge tone={ACTION_TONES[selectedRecord.action]}>
                    {selectedRecord.action}
                  </ToneBadge>
                </div>
                <SheetDescription>
                  {selectedRecord.entityType} · {selectedRecord.entityName}
                </SheetDescription>
              </SheetHeader>

              <SheetBody className="space-y-4">
                <div className="space-y-2">
                  <span className="telemetry block text-subtle-foreground">Value mutation diff</span>
                  <div className="space-y-2 rounded-lg border border-border bg-surface p-3 font-mono text-meta">
                    <div className="flex items-start gap-2 text-danger">
                      <span className="select-none font-bold">-</span>
                      <div className="min-w-0 flex-1 break-all">
                        <span className="text-muted-foreground">
                          {selectedRecord.fieldName ?? "state"}:{" "}
                        </span>
                        <span>{selectedRecord.previousValue ?? "(empty / initial)"}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-success">
                      <span className="select-none font-bold">+</span>
                      <div className="min-w-0 flex-1 break-all">
                        <span className="text-muted-foreground">
                          {selectedRecord.fieldName ?? "state"}:{" "}
                        </span>
                        <span>{selectedRecord.newValue ?? "(deleted / empty)"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-meta">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Actor</span>
                    <span className="font-medium text-foreground">
                      {selectedRecord.actorName} ({selectedRecord.actorRole})
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 font-mono text-micro">
                    <span className="text-muted-foreground">IP address</span>
                    <span className="text-foreground">{selectedRecord.actorIp}</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-mono text-micro">
                    <span className="text-muted-foreground">Timestamp</span>
                    <span className="text-foreground">{dateTime(selectedRecord.timestamp)}</span>
                  </div>
                </div>
              </SheetBody>

              <SheetFooter>
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
