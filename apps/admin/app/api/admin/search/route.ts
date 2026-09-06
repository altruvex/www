import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@repo/database";
import { requireAdminSession } from "@/lib/require-admin";

/**
 * Global search behind ⌘K (§20).
 *
 * Deliberately four small parallel `contains` queries rather than one clever
 * union: Postgres plans each of them off an existing index, the result set is
 * capped, and the shape stays obvious. If this ever gets slow the answer is a
 * tsvector column, not a bigger query here.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = { contains: q, mode: "insensitive" as const };

  const [clients, proposals, contracts, projects] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [{ name: like }, { company: like }, { email: like }, { phone: { contains: q } }],
      },
      select: { id: true, name: true, company: true, phone: true, status: true },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.proposal.findMany({
      where: {
        OR: [
          { projectType: like },
          { client: { is: { OR: [{ name: like }, { company: like }] } } },
        ],
      },
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
      where: { client: { is: { OR: [{ name: like }, { company: like }] } } },
      select: {
        id: true,
        status: true,
        client: { select: { name: true, company: true } },
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        OR: [{ name: like }, { client: { is: { OR: [{ name: like }, { company: like }] } } }],
      },
      select: { id: true, name: true, phase: true, status: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const label = (c: { name: string | null; company: string | null }) =>
    c.company || c.name || "Unnamed client";

  return NextResponse.json({
    results: [
      ...clients.map((c) => ({
        id: c.id,
        type: "client" as const,
        title: label(c),
        subtitle: c.phone,
        href: `/clients/${c.id}`,
      })),
      ...proposals.map((p) => ({
        id: p.id,
        type: "proposal" as const,
        title: `${label(p.client)} · ${p.projectType}`,
        subtitle: `${p.currency} ${p.totalPrice.toLocaleString()}`,
        href: `/proposals/${p.id}`,
      })),
      ...contracts.map((c) => ({
        id: c.id,
        type: "contract" as const,
        title: label(c.client),
        subtitle: c.status,
        href: `/contracts/${c.id}`,
      })),
      ...projects.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.name,
        subtitle: p.phase,
        href: `/projects/${p.id}`,
      })),
    ],
  });
}
