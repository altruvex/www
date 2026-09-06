import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { ThreadList } from "@/components/os/thread-list";
import { getThreads } from "@/lib/threads";
import { percent } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const [threads, byStatus, templates] = await Promise.all([
    getThreads(),
    prisma.whatsAppMessage.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.whatsAppMessage.groupBy({
      by: ["templateName"],
      where: { templateName: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const count = (status: string) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const sent = byStatus.reduce((s, row) => s + row._count._all, 0);
  const failed = count("FAILED");
  const delivered = count("DELIVERED") + count("READ");

  return (
    <div className="space-y-4">
      <PageHeader
        title="WhatsApp"
        description="The channel Altruvex actually closes business on. Every message is bound to a client, and proposal and contract sends are recorded against those records."
        actions={
          <Button asChild variant="outline">
            <Link href="/integrations">
              Connection settings
            </Link>
          </Button>
        }
      />

      {failed > 0 && (
        <AlertBar tone="danger">
          {failed} message{failed === 1 ? "" : "s"} failed to deliver. The client never
          received them — open the thread and resend, or check the Cloud API credentials
          under Integrations.
        </AlertBar>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Messages" value={sent} sub="All time, both directions" />
        <StatTile
          label="Delivered"
          value={percent(sent ? Math.round((delivered / sent) * 100) : 0)}
          sub={`${delivered} reached a device`}
          tone={sent && delivered / sent > 0.9 ? "success" : "warning"}
        />
        <StatTile label="Failed" value={failed} sub={failed ? "Needs a resend" : "None"} tone={failed ? "danger" : "success"} />
        <StatTile label="Threads" value={threads.length} sub="Clients with a conversation" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {threads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations"
            body="Nothing has been sent or received through the Cloud API yet. Sending a proposal from a client record is the usual first message, and it creates the thread automatically."
          />
        ) : (
          <Panel title="Conversations" description="Unanswered first" flush>
            <ThreadList threads={threads} />
          </Panel>
        )}

        <Panel title="Templates in use" description="Approved templates the system has sent">
          {templates.length === 0 ? (
            <p className="text-base text-muted-foreground">
              No templated message has been sent. Templates are what let Altruvex open a
              conversation outside the 24-hour window — the proposal and onboarding sends
              use them.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {templates.map((template) => (
                <li key={template.templateName} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-meta">{template.templateName}</span>
                  <span className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground">
                    {template._count._all}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
