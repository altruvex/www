import Link from "next/link";
import { cn } from "@/lib/utils";
import { getChannelCounts } from "@/lib/threads";

export type InboxChannel = "all" | "whatsapp" | "email";

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
