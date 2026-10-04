import Link from "next/link";

import { Panel } from "@/components/os/panel";
import { money } from "@/lib/format";
import type { ProposalService } from "@/lib/proposal-schema";
import { annualised, KIND_LABEL, perTermLabel, termLabel } from "@/lib/service-lifecycle";

export function ServiceTermsPanel({
  services,
  currency,
  liveHref,
}: {
  services: ProposalService[];
  currency: string;
  liveHref?: string;
}) {
  if (services.length === 0) return null;
  const yearly = services.reduce((sum, s) => sum + annualised(s.price, s.termMonths), 0);

  return (
    <Panel
      title="Recurring services"
      description={`Billed separately from the fee · ${money(yearly, currency)} per year`}
      flush
      action={
        liveHref ? (
          <Link href={liveHref} className="text-meta text-muted-foreground hover:text-foreground">
            Tracked services →
          </Link>
        ) : undefined
      }
    >
      <ul className="divide-y divide-border">
        {services.map((service, i) => (
          <li key={`${service.name}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className={service.kind === "DOMAIN" ? "font-mono text-base" : "text-base"}>
                {service.name}
              </span>
              <span className="telemetry ms-2 text-subtle-foreground">{KIND_LABEL[service.kind]}</span>
              <span className="block text-meta text-muted-foreground">
                {[
                  service.provider || null,
                  termLabel(service.termMonths),
                  service.termMonths !== null && service.firstTermIncluded ? "first term in the project fee" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 font-mono text-base tabular-nums">
              {money(service.price, currency)}
              <span className="ms-1 text-meta text-subtle-foreground">{perTermLabel(service.termMonths)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
