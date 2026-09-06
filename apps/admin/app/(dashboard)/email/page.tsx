import { PlannedModule } from "@/components/os/planned";

export default function EmailPage() {
  return (
    <PlannedModule
      title="Email"
      crumbs={[{ label: "Communication" }, { label: "Email" }]}
      blurb="Outbound transactional mail with templates, variables, threading and delivery status."
      purpose={[
        "Send proposals and contracts by email as well as WhatsApp, for clients who prefer it.",
        "Template library with the same variable set the WhatsApp templates use.",
        "Delivery, bounce and open status recorded against the client, exactly like a message.",
        "Internal notification mail for the action centre.",
      ]}
      blockedBy={[
        "A mail transport: SMTP credentials for Nodemailer, or a transactional provider.",
        "An EmailMessage model mirroring WhatsAppMessage, so both channels share one thread view.",
        "A bounce/complaint webhook endpoint, verified the way the WhatsApp webhook is.",
      ]}
      today={{ label: "WhatsApp carries every client-facing send", href: "/whatsapp" }}
    />
  );
}
