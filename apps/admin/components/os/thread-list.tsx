import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { when, truncate } from "@/lib/format";
import type { Thread } from "@/lib/threads";

export function ThreadList({ threads }: { threads: Thread[] }) {
  return (
    <ul className="rows">
      {threads.map((thread) => (
        <li key={thread.clientId}>
          <Link
            href={`/whatsapp/${thread.clientId}`}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 transition-colors duration-[var(--dur-state)]",
              "hover:bg-surface/70",
              thread.unanswered && "bg-warning/[0.05]",
            )}
          >
            <Avatar name={thread.clientName} size="md" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-base font-medium">{thread.clientName}</span>
                <span className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground">
                  {when(thread.lastAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-meta text-muted-foreground">
                <span className="text-subtle-foreground">
                  {thread.lastDirection === "INBOUND" ? "" : "You: "}
                </span>
                {truncate(thread.lastMessage, 90)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusPill registry="submissionStatus" value={thread.stage} variant="dot" />
                <span className="inline-flex items-center gap-1 font-mono text-micro text-subtle-foreground">
                  <MessageCircle className="size-2.5" aria-hidden />
                  {thread.total}
                </span>
                {thread.unanswered && (
                  <span className="rounded-sm border border-warning/25 bg-warning/10 px-1.5 py-px text-micro font-medium text-warning">
                    Needs a reply
                  </span>
                )}
                {thread.failed > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-danger/25 bg-danger/10 px-1.5 py-px text-micro font-medium text-danger">
                    <AlertTriangle className="size-2.5" aria-hidden />
                    {thread.failed} failed
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
