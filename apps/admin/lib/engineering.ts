import { prisma, type DeployEnvironment, type LogLevel, type Prisma } from "@repo/database";

/**
 * Reads for the engineering side of the OS (§6–§8).
 *
 * Everything here is server-side and filtered in the database, not in the page.
 * Logs in particular are the one table in this system that can reach six
 * figures of rows, so `listLogs` pages at the query and never loads a product's
 * full history to count it (§24).
 */

export const LOG_PAGE_SIZE = 100;

/** Cross-product operational summary — what the Overview and nav badges read. */
export async function getEngineeringSummary(now: Date = new Date()) {
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [
    products,
    liveProducts,
    openIncidents,
    failedDeployments,
    failedBuilds,
    recentErrors,
    lastDeployment,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "LIVE" } }),
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.deployment.count({
      where: { status: "FAILED", createdAt: { gte: weekAgo } },
    }),
    prisma.build.count({ where: { status: "FAILED", createdAt: { gte: weekAgo } } }),
    prisma.logEntry.count({
      where: { level: { in: ["ERROR", "FATAL"] }, timestamp: { gte: dayAgo } },
    }),
    prisma.deployment.findFirst({
      where: { status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true, product: { select: { name: true } } },
    }),
  ]);

  return {
    products,
    liveProducts,
    openIncidents,
    failedDeployments,
    failedBuilds,
    recentErrors,
    lastDeployment,
    /** True when nothing has ever been ingested — the screens say so plainly. */
    isEmpty: products === 0,
  };
}

export async function listProducts() {
  const products = await prisma.product.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, name: true, phase: true } },
      _count: { select: { incidents: true, deployments: true, builds: true } },
    },
  });

  // The last deployment per product, and the open-incident count, are what an
  // operator actually scans this list for. Two grouped queries beat N+1.
  const [lastDeployments, openIncidents] = await Promise.all([
    prisma.deployment.findMany({
      where: { productId: { in: products.map((p) => p.id) }, status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
      select: {
        productId: true,
        number: true,
        finishedAt: true,
        version: true,
        environment: true,
      },
    }),
    prisma.incident.groupBy({
      by: ["productId"],
      where: { status: { not: "RESOLVED" } },
      _count: { _all: true },
    }),
  ]);

  const latestByProduct = new Map<string, (typeof lastDeployments)[number]>();
  for (const d of lastDeployments) {
    if (!latestByProduct.has(d.productId)) latestByProduct.set(d.productId, d);
  }
  const openByProduct = new Map(openIncidents.map((i) => [i.productId, i._count._all]));

  return products.map((product) => ({
    ...product,
    lastDeployment: latestByProduct.get(product.id) ?? null,
    openIncidents: openByProduct.get(product.id) ?? 0,
  }));
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true } },
      project: { select: { id: true, name: true, phase: true, status: true } },
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          build: { select: { id: true, number: true, status: true } },
          rolledBackBy: { select: { id: true, number: true } },
        },
      },
      builds: { orderBy: { createdAt: "desc" }, take: 25 },
      incidents: {
        orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { detectedAt: "desc" }],
        take: 25,
        include: { owner: { select: { name: true, email: true } } },
      },
    },
  });
}

export interface DeploymentFilters {
  productId?: string;
  environment?: DeployEnvironment;
  status?: string;
}

export async function listDeployments(filters: DeploymentFilters = {}, take = 100) {
  return prisma.deployment.findMany({
    where: {
      productId: filters.productId,
      environment: filters.environment,
      status: filters.status as Prisma.EnumDeploymentStatusFilter | undefined,
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
      build: { select: { id: true, number: true, status: true } },
      rolledBackBy: { select: { id: true, number: true } },
    },
  });
}

export async function listBuilds(
  filters: { productId?: string; status?: string } = {},
  take = 100,
) {
  return prisma.build.findMany({
    where: {
      productId: filters.productId,
      status: filters.status as Prisma.EnumBuildStatusFilter | undefined,
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
      _count: { select: { deployments: true } },
    },
  });
}

export interface LogFilters {
  productId?: string;
  environment?: DeployEnvironment;
  level?: LogLevel;
  /** Free text, matched against the message. */
  q?: string;
  requestId?: string;
  deploymentId?: string;
  buildId?: string;
  /** Opaque cursor: the id of the last row on the previous page. */
  cursor?: string;
}

/**
 * One page of logs, newest first.
 *
 * Cursor-paginated rather than offset-paginated: `skip: 50_000` makes Postgres
 * walk fifty thousand rows to throw them away, and the offset shifts under you
 * as new lines arrive. The cursor is stable against both.
 *
 * Deliberately returns no total count — `COUNT(*)` over a large log table is
 * the expensive query on this page, and "how many errors are there exactly" is
 * not a question anyone asks while debugging.
 */
export async function listLogs(filters: LogFilters = {}) {
  const where: Prisma.LogEntryWhereInput = {
    productId: filters.productId,
    environment: filters.environment,
    level: filters.level,
    requestId: filters.requestId,
    deploymentId: filters.deploymentId,
    buildId: filters.buildId,
    ...(filters.q ? { message: { contains: filters.q, mode: "insensitive" } } : {}),
  };

  const rows = await prisma.logEntry.findMany({
    where,
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: LOG_PAGE_SIZE + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include: {
      product: { select: { id: true, name: true, slug: true } },
      deployment: { select: { id: true, number: true } },
      build: { select: { id: true, number: true } },
    },
  });

  // One extra row is fetched purely to answer "is there another page", without
  // a second count query.
  const hasMore = rows.length > LOG_PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, LOG_PAGE_SIZE) : rows;

  return {
    entries,
    hasMore,
    nextCursor: hasMore ? (entries[entries.length - 1]?.id ?? null) : null,
  };
}

export async function listIncidents(openOnly = false) {
  return prisma.incident.findMany({
    where: openOnly ? { status: { not: "RESOLVED" } } : undefined,
    orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { detectedAt: "desc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      deployment: { select: { id: true, number: true, environment: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Mean time to resolve, in hours, over incidents closed in the window. */
export async function incidentStats(sinceDays = 90, now: Date = new Date()) {
  const since = new Date(now.getTime() - sinceDays * 86_400_000);
  const resolved = await prisma.incident.findMany({
    where: { status: "RESOLVED", resolvedAt: { gte: since } },
    select: { detectedAt: true, resolvedAt: true, severity: true },
  });

  if (resolved.length === 0) return { resolvedCount: 0, mttrHours: null };

  const totalMs = resolved.reduce(
    (sum, i) => sum + ((i.resolvedAt?.getTime() ?? 0) - i.detectedAt.getTime()),
    0,
  );
  return {
    resolvedCount: resolved.length,
    mttrHours: Math.round(totalMs / resolved.length / 3_600_000),
  };
}
