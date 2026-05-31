import Link from "next/link";
import { Calendar, Mail, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { monoCaps } from "@/lib/mono-caps";
import { Container } from "@/components/container";
import { LoadingIcon } from "@/components/loading-icon";

const cards = [
  {
    href: "/contacts",
    title: "Contacts",
    description: "View and manage incoming contact requests and inquiries",
    cta: "View all messages",
    icon: Mail,
    iconClass: "bg-brand/10 text-brand",
    linkClass: "text-brand",
  },
  {
    href: "/meetings",
    title: "Meetings",
    description: "Manage scheduled meetings and appointments with clients",
    cta: "View all meetings",
    icon: Calendar,
    iconClass: "bg-success/10 text-success",
    linkClass: "text-success",
  },
  {
    href: "/leads",
    title: "Leads",
    description: "Track leads from the transparency estimator flow",
    cta: "View all leads",
    icon: Users,
    iconClass: "bg-warning/10 text-warning",
    linkClass: "text-warning",
  },
] as const;

export default function Home() {
  return (
    <div className="py-24">
      <Container>
        <div className="space-y-10">
          <div>
            <p className={cn(monoCaps, "text-muted-foreground mb-3")}>Overview</p>
            <h1 className="text-foreground mb-2">Admin dashboard</h1>
            <p className="max-w-xl text-muted-foreground">
              Choose a section to manage inbound requests, meetings, and estimator
              leads.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex flex-col gap-4 rounded-4xl liquid-glass p-8 transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-xl",
                      card.iconClass,
                    )}
                  >
                    <Icon className="size-7" />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-2 text-xl font-medium text-foreground">
                      {card.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 text-sm font-medium",
                      card.linkClass,
                    )}
                  >
                    {card.cta}
                    <svg
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </div>
  );
}
