import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { ThreadList } from "@/components/os/thread-list";
import { getThreads } from "@/lib/threads";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const threads = await getThreads();
  const unanswered = threads.filter((t) => t.unanswered);
  const failed = threads.filter((t) => t.failed > 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        description="Every conversation, unanswered first. A thread here is attached to a client record — replying never means leaving the system to find who they are."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Needs a reply"
          value={unanswered.length}
          sub={unanswered.length ? "Client spoke last" : "Everyone has been answered"}
          tone={unanswered.length ? "danger" : "success"}
        />
        <StatTile label="Active threads" value={threads.length} sub="Clients with any message" />
        <StatTile
          label="Delivery failures"
          value={failed.length}
          sub={failed.length ? "Messages the client never got" : "All delivered"}
          tone={failed.length ? "danger" : "success"}
        />
      </div>

      {threads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No conversations yet"
          body="Threads appear as soon as a message is sent from a proposal or a contract, or as soon as a client writes in. Each one stays attached to the client record it belongs to."
          action={
            <Button asChild variant="outline">
              <Link href="/integrations">
                Check the WhatsApp connection
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {unanswered.length > 0 && (
            <Panel
              title="Waiting on you"
              description="The client spoke last in these threads"
              flush
            >
              <ThreadList threads={unanswered} />
            </Panel>
          )}
          <Panel title="All conversations" flush>
            <ThreadList threads={threads} />
          </Panel>
        </>
      )}
    </div>
  );
}
