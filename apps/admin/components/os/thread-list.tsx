import Link from "next/link";
import { AlertTriangle, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/badge";
import { EntityLink } from "@/components/os/entity-link";
import { Avatar } from "@repo/ui";
import { when, truncate } from "@/lib/format";
import type { Channel, ConversationThread, Thread } from "@/lib/threads";

const CHANNEL = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  email: { label: "Email", icon: Mail },
} as const;

export function ThreadList({
  threads,
  hrefFor,
  selectedId,
}: {
  threads: (Thread | ConversationThread)[];
  hrefFor?: (thread: Thread | ConversationThread) => string;
  selectedId?: string;
}) {
  return (
    <ul className="rows">
      {threads.map((thread) => {
        const unified = "channels" in thread;
        const href = hrefFor
          ? hrefFor(thread)
          : unified
            ? thread.href
            : `/whatsapp/${thread.clientId}`;
        const selected = selectedId === thread.clientId;
        const channels: Channel[] = unified ? thread.channels : ["whatsapp"];
        const lastChannel: Channel = unified ? thread.lastChannel : "whatsapp";
        return (
          <li
            key={thread.clientId}
            className={cn(
              "relative flex items-start gap-3 px-3 py-2.5 transition-colors duration-[var(--dur-state)]",
              "hover:bg-surface/70",
              thread.unanswered && "bg-warning/[0.05]",
              selected &&
                "bg-surface before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-brand",
            )}
            aria-current={selected ? "true" : undefined}
          >
            <Avatar name={thread.clientName} size="md" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <EntityLink
                  type="client"
                  id={thread.clientId}
                  className="relative z-10 min-w-0 truncate text-base font-medium"
                >
                  {thread.clientName}
                </EntityLink>
                <span className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground">
                  {when(thread.lastAt)}
                </span>
              </div>
              <Link
                href={href}
                className="mt-0.5 block truncate rounded-xs text-meta text-muted-foreground after:absolute after:inset-0 after:content-['']"
              >
                <span className="text-subtle-foreground">
                  {thread.lastDirection === "INBOUND" ? "" : "You: "}
                </span>
                {unified && channels.length > 1 && (
                  <span className="text-subtle-foreground">
                    {CHANNEL[lastChannel].label} ·{" "}
                  </span>
                )}
                {truncate(thread.lastMessage, 90)}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusPill registry="submissionStatus" value={thread.stage} variant="dot" />
                {channels.map((channel) => {
                  const Icon = CHANNEL[channel].icon;
                  return (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1 font-mono text-micro text-subtle-foreground"
                    >
                      <Icon className="size-2.5" aria-hidden />
                      {CHANNEL[channel].label}
                    </span>
                  );
                })}
                <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                  {thread.total} {thread.total === 1 ? "message" : "messages"}
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
          </li>
        );
      })}
    </ul>
  );
}
