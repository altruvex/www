import Link from "next/link";
import { cn } from "@/lib/utils";
import { getChannelCounts } from "@/lib/threads";

export type InboxChannel = "all" | "whatsapp" | "email";

/**
 * The three conversation routes read as one surface. They stay separate pages
 * (the palette links /whatsapp and /email directly), so these are plain links
 * to real routes rather than a `?tab=` param — the markup is TabNav's, copied
 * because TabNav derives every href from one base path.
 *
 * When a page is scoped to one client the scope follows the operator across the
 * tabs, so "this client, on email" is one click from "this client, on WhatsApp".
 *
 * Counts are what needs a person: WhatsApp threads waiting on a reply, email
 * the transport refused. All is their sum. Email cannot be "unanswered" — it is
 * outbound only — so it never contributes to the reply count.
 */
export async function ChannelTabs({
  active,
  clientId,
}: {
  active: InboxChannel;
  clientId?: string;
}) {
  const { unanswered, failedEmails } = await getChannelCounts();
  const tabs: { id: InboxChannel; label: string; href: string; count: number }[] = [
    {
      id: "all",
      label: "All",
      href: clientId ? `/inbox?client=${clientId}` : "/inbox",
      count: unanswered + failedEmails,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: clientId ? `/whatsapp/${clientId}` : "/whatsapp",
      count: unanswered,
    },
    {
      id: "email",
      label: "Email",
      href: clientId ? `/email?client=${clientId}` : "/email",
      count: failedEmails,
    },
  ];

  return (
    <nav
      aria-label="Channels"
      className="flex h-9 items-center gap-4 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-base",
              "transition-colors duration-[var(--dur-state)]",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
