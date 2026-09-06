import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { buildActivity } from "@/lib/activity";
import { ActivityFeed } from "./activity-feed";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const [clients, submissions, proposals, contracts, projects, payments, messages, meetings, transparencyLeads] =
    await Promise.all([
      prisma.client.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, name: true, company: true, source: true, createdAt: true },
      }),
      prisma.contactSubmission.findMany({
        orderBy: { submittedAt: "desc" },
        take: 40,
        select: {
          id: true,
          name: true,
          submittedAt: true,
          firstViewedAt: true,
          firstContactedAt: true,
          utmSource: true,
          referrer: true,
          serviceInterest: true,
        },
      }),
      prisma.proposal.findMany({
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          createdAt: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          respondedAt: true,
          status: true,
          totalPrice: true,
          currency: true,
          validUntil: true,
          client: { select: { name: true, company: true } },
        },
      }),
      prisma.contract.findMany({
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          createdAt: true,
          status: true,
          signedAt: true,
          signedByName: true,
          onboardingMessageSentAt: true,
          client: { select: { name: true, company: true } },
        },
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          name: true,
          createdAt: true,
          phase: true,
          actualLaunchDate: true,
          client: { select: { name: true, company: true } },
        },
      }),
      prisma.payment.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 40,
        select: {
          id: true,
          milestone: true,
          amount: true,
          status: true,
          paidAt: true,
          dueDate: true,
          projectId: true,
          project: { select: { name: true, client: { select: { name: true, company: true } } } },
        },
      }),
      prisma.whatsAppMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        select: {
          id: true,
          direction: true,
          body: true,
          createdAt: true,
          status: true,
          templateName: true,
          client: { select: { id: true, name: true, company: true } },
        },
      }),
      prisma.meeting.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          createdAt: true,
          completedAt: true,
          guestName: true,
          contactSubmission: { select: { name: true } },
        },
      }),
      prisma.transparencyLead.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          projectType: true,
          priceMin: true,
          priceMax: true,
          createdAt: true,
          convertedAt: true,
        },
      }),
    ]);

  // buildActivity takes a single client; here we fan it over the whole system by
  // calling it per source group and merging — the sort inside handles ordering.
  const events = [
    ...buildActivity({ proposals, contracts, projects, payments, messages, meetings }),
    ...clients.flatMap((client) => buildActivity({ client })),
    ...submissions.flatMap((submission) => buildActivity({ submission })),
    ...transparencyLeads.flatMap((transparencyLead) => buildActivity({ transparencyLead })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = events.filter(
    (e) => new Date(e.at).toISOString().slice(0, 10) === today,
  ).length;

  const serializedEvents = events.slice(0, 200).map((e) => ({
    id: e.id,
    at: typeof e.at === "string" ? e.at : e.at.toISOString(),
    iconName: e.iconName || "Activity",
    tone: e.tone,
    title: e.title,
    detail: e.detail,
    href: e.href,
    meta: e.meta,
    category: e.category,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Everything that happened, newest first. Derived from the records themselves, so it can never disagree with them."
        meta={<span>{todayCount} event{todayCount === 1 ? "" : "s"} today · {events.length} shown</span>}
      />

      <ActivityFeed events={serializedEvents} todayCount={todayCount} />
    </div>
  );
}

