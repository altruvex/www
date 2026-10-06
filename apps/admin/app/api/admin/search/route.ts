import { NextResponse } from "next/server";
import { normalizePhone, prisma } from "@repo/database";
import { entityHref, entityNoun, type EntityKind } from "@/lib/entity-links";
import { money } from "@/lib/format";
import { canSeeFinance } from "@/lib/nav";
import { withAdmin } from "@/lib/with-admin";

type Result = {
  id: string;
  kind: EntityKind;
  noun: string;
  title: string;
  subtitle?: string;
  href: string;
};

type ClientName = { name: string | null; company: string | null };
const label = (c: ClientName | null | undefined) => c?.company || c?.name || "Unnamed client";

const clientMatch = (like: { contains: string; mode: "insensitive" }) => ({
  is: { OR: [{ name: like }, { company: like }] },
});

export const GET = withAdmin(async (request, { role }) => {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const onlyClients = request.nextUrl.searchParams.get("type") === "client";
  if (!onlyClients && q.length < 2) return NextResponse.json({ results: [] });

  const like = { contains: q, mode: "insensitive" as const };
  const digits = normalizePhone(q);
  const phoneTerms = new Set<string>();
  if (q) phoneTerms.add(q);
  if (digits.length >= 4) {
    phoneTerms.add(digits);
    phoneTerms.add(digits.slice(-9));
  }
  const phoneMatch = [...phoneTerms].map((t) => ({ phone: { contains: t } }));
  const ref = /^[0-9a-f-]{4,36}$/i.test(q) ? q.toLowerCase() : null;
  const refMatch = ref ? [{ id: { startsWith: ref } }] : [];
  const finance = canSeeFinance(role);
  const asNumber = /^#?\d{1,9}$/.test(q) ? Number(q.replace("#", "")) : null;

  const clients = await prisma.client.findMany({
    where: q
      ? { OR: [{ name: like }, { company: like }, { email: like }, ...phoneMatch] }
      : {},
    select: { id: true, name: true, company: true, phone: true, email: true },
    take: onlyClients ? 10 : 6,
    orderBy: { updatedAt: "desc" },
  });

  const results: Result[] = [];
  const push = (kind: EntityKind, id: string, title: string, subtitle?: string | null) => {
    const href = entityHref(kind, id);
    if (!href) return;
    results.push({ id, kind, noun: entityNoun(kind), title, subtitle: subtitle ?? undefined, href });
  };

  for (const c of clients) push("client", c.id, label(c), c.phone || c.email);
  if (onlyClients) return NextResponse.json({ results });

  const [
    proposals,
    contracts,
    projects,
    products,
    incidents,
    deployments,
    builds,
    tasks,
    submissions,
    estimateLeads,
    services,
    meetings,
    users,
    subscriptions,
    payments,
  ] = await Promise.all([
    prisma.proposal.findMany({
      where: { OR: [{ projectType: like }, { client: clientMatch(like) }, ...refMatch] },
      select: {
        id: true,
        projectType: true,
        totalPrice: true,
        currency: true,
        status: true,
        client: { select: { name: true, company: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contract.findMany({
      where: { OR: [{ client: clientMatch(like) }, ...refMatch] },
      select: { id: true, status: true, client: { select: { name: true, company: true } } },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { OR: [{ name: like }, { client: clientMatch(like) }, ...refMatch] },
      select: { id: true, name: true, phase: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { OR: [{ name: like }, { slug: like }, { productionUrl: like }] },
      select: { id: true, name: true, productionUrl: true, status: true },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.incident.findMany({
      where: {
        OR: [{ title: like }, ...(asNumber != null ? [{ number: asNumber }] : [])],
      },
      select: {
        id: true,
        number: true,
        title: true,
        severity: true,
        status: true,
        product: { select: { name: true } },
      },
      take: 4,
      orderBy: { detectedAt: "desc" },
    }),
    prisma.deployment.findMany({
      where: {
        OR: [
          { commitSha: { startsWith: q.toLowerCase() } },
          { version: like },
          ...(asNumber != null ? [{ number: asNumber }] : []),
        ],
      },
      select: {
        id: true,
        number: true,
        environment: true,
        status: true,
        commitSha: true,
        product: { select: { name: true } },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.build.findMany({
      where: {
        OR: [
          { commitSha: { startsWith: q.toLowerCase() } },
          { branch: like },
          { commitMessage: like },
        ],
      },
      select: {
        id: true,
        number: true,
        branch: true,
        status: true,
        commitSha: true,
        product: { select: { name: true } },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectTask.findMany({
      where: { title: like },
      select: { id: true, title: true, status: true, project: { select: { name: true } } },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contactSubmission.findMany({
      where: { OR: [{ name: like }, { email: like }, ...phoneMatch, { message: like }] },
      select: { id: true, name: true, status: true, phone: true },
      take: 4,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.transparencyLead.findMany({
      where: {
        OR: [{ reference: like }, { name: like }, { email: like }, { company: like }, ...phoneMatch],
      },
      select: { id: true, reference: true, name: true, company: true, projectType: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientService.findMany({
      where: {
        OR: [{ name: like }, { reference: like }, { provider: like }, { client: clientMatch(like) }],
      },
      select: {
        id: true,
        name: true,
        kind: true,
        provider: true,
        client: { select: { name: true, company: true } },
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: { OR: [{ title: like }, { guestName: like }, { guestEmail: like }] },
      select: { id: true, title: true, scheduledDate: true, scheduledTime: true },
      take: 4,
      orderBy: { scheduledDate: "desc" },
    }),
    prisma.user.findMany({
      where: { OR: [{ name: like }, { email: like }] },
      select: { id: true, name: true, email: true },
      take: 3,
      orderBy: { name: "asc" },
    }),
    finance
      ? prisma.maintenanceSubscription.findMany({
          where: { client: clientMatch(like) },
          select: {
            id: true,
            planId: true,
            status: true,
            client: { select: { name: true, company: true } },
          },
          take: 4,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    finance
      ? prisma.payment.findMany({
          where: { OR: [{ invoiceNumber: like }, { reference: like }] },
          select: {
            id: true,
            invoiceNumber: true,
            reference: true,
            milestone: true,
            status: true,
            project: { select: { name: true } },
          },
          take: 4,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const words = (value: string) => value.toLowerCase().replace(/_/g, " ");

  for (const p of proposals) {
    push(
      "proposal",
      p.id,
      `${label(p.client)} · ${p.projectType}`,
      finance ? money(p.totalPrice, p.currency) : words(p.status),
    );
  }
  for (const c of contracts) push("contract", c.id, label(c.client), `${c.id.slice(0, 8).toUpperCase()} · ${words(c.status)}`);
  for (const p of projects) push("project", p.id, p.name, words(p.phase));
  for (const p of products) push("product", p.id, p.name, p.productionUrl ?? words(p.status));
  for (const i of incidents) {
    push("incident", i.id, `#${i.number} ${i.title}`, `${i.severity} · ${i.product.name} · ${words(i.status)}`);
  }
  for (const d of deployments) {
    push(
      "deployment",
      d.id,
      `${d.product.name} #${d.number}`,
      [words(d.environment), words(d.status), d.commitSha?.slice(0, 7)].filter(Boolean).join(" · "),
    );
  }
  for (const b of builds) {
    push(
      "build",
      b.id,
      `${b.product.name} build #${b.number}`,
      [b.branch, words(b.status), b.commitSha?.slice(0, 7)].filter(Boolean).join(" · "),
    );
  }
  for (const t of tasks) push("task", t.id, t.title, `${t.project.name} · ${words(t.status)}`);
  for (const s of submissions) push("submission", s.id, s.name, `${s.phone} · ${words(s.status)}`);
  for (const l of estimateLeads) {
    push("transparency_lead", l.id, l.company || l.name || l.reference, `${l.reference} · ${l.projectType}`);
  }
  for (const s of services) {
    push(
      "client_service",
      s.id,
      s.name,
      [label(s.client), words(s.kind), s.provider].filter(Boolean).join(" · "),
    );
  }
  for (const m of meetings) {
    push("meeting", m.id, m.title, `${m.scheduledDate.toISOString().slice(0, 10)} ${m.scheduledTime}`);
  }
  for (const u of users) push("user", u.id, u.name || u.email, u.email);
  for (const s of subscriptions) push("subscription", s.id, label(s.client), `${s.planId} · ${words(s.status)}`);
  for (const p of payments) {
    push(
      "payment",
      p.id,
      p.invoiceNumber ?? p.reference ?? words(p.milestone),
      [p.project?.name, words(p.milestone), words(p.status)].filter(Boolean).join(" · "),
    );
  }

  return NextResponse.json({ results });
});
