import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { NewClientForm } from "./new-client-form";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Clients", href: "/clients" }, { label: "New" }]}
        title="New client"
        description="Add a client that did not come through the website — a referral, a call, someone you met. Everything downstream hangs off this record."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <Panel title="Details">
          <NewClientForm />
        </Panel>
        <Panel title="What happens next" description="So there is no surprise">
          <ol className="space-y-2.5">
            {[
              "The client is created at stage New, source Added manually.",
              "It appears in Leads and on the pipeline board immediately.",
              "From the client page you can build a proposal, which prices the work from the same table the public estimator uses.",
              "Sending that proposal moves the deal forward on its own — the stage is derived from the documents, not typed in.",
            ].map((step, i) => (
              <li key={step} className="flex gap-2.5 text-base">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-micro text-subtle-foreground">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
