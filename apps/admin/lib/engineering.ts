import {
  prisma,
  type DeployEnvironment,
  type IncidentSeverity,
  type IncidentStatus,
  type LogLevel,
  type Prisma,
} from "@repo/database";

export const LOG_PAGE_SIZE = 100;

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
    isEmpty: products === 0,
  };
}

export interface ProductListFilters {
  clientId?: string;
  projectId?: string;
}

export async function listProducts(filters: ProductListFilters = {}) {
  const products = await prisma.product.findMany({
    where: {
      clientId: filters.clientId,
      projectId: filters.projectId,
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, name: true, phase: true } },
      _count: { select: { incidents: true, deployments: true, builds: true } },
    },
  });

  const [lastProduction, openIncidents] = await Promise.all([
    Promise.all(
      products.map((product) =>
        prisma.deployment.findFirst({
          where: { productId: product.id, status: "SUCCEEDED", environment: "PRODUCTION" },
          orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
          select: { id: true, number: true, finishedAt: true, createdAt: true, version: true },
        }),
      ),
    ),
    prisma.incident.groupBy({
      by: ["productId"],
      where: { status: { not: "RESOLVED" }, productId: { in: products.map((p) => p.id) } },
      _count: { _all: true },
    }),
  ]);

  const openByProduct = new Map(openIncidents.map((i) => [i.productId, i._count._all]));

  return products.map((product, index) => ({
    ...product,
    lastProductionDeployment: lastProduction[index] ?? null,
    openIncidents: openByProduct.get(product.id) ?? 0,
  }));
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true } },
      project: { select: { id: true, name: true, phase: true, status: true } },
      services: {
        orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
        select: {
          id: true,
          kind: true,
          name: true,
          provider: true,
          status: true,
          expiresAt: true,
          termMonths: true,
          autoRenew: true,
        },
      },
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
  clientId?: string;
}

function deploymentWhere(filters: DeploymentFilters): Prisma.DeploymentWhereInput {
  return {
    productId: filters.productId,
    environment: filters.environment,
    status: filters.status as Prisma.EnumDeploymentStatusFilter | undefined,
    ...(filters.clientId ? { product: { clientId: filters.clientId } } : {}),
  };
}

export async function listDeployments(filters: DeploymentFilters = {}, take = 100) {
  return prisma.deployment.findMany({
    where: deploymentWhere(filters),
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

export interface BuildFilters {
  productId?: string;
  status?: string;
  environment?: DeployEnvironment;
  clientId?: string;
}

function buildWhere(filters: BuildFilters): Prisma.BuildWhereInput {
  return {
    productId: filters.productId,
    environment: filters.environment,
    status: filters.status as Prisma.EnumBuildStatusFilter | undefined,
    ...(filters.clientId ? { product: { clientId: filters.clientId } } : {}),
  };
}

export async function listBuilds(filters: BuildFilters = {}, take = 100) {
  return prisma.build.findMany({
    where: buildWhere(filters),
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

export const LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const satisfies readonly LogLevel[];

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);
}

export function levelsAtLeast(min: LogLevel): LogLevel[] {
  return LOG_LEVELS.slice(LOG_LEVELS.indexOf(min));
}

export interface LogFilters {
  productId?: string;
  environment?: DeployEnvironment;
  minLevel?: LogLevel;
  q?: string;
  requestId?: string;
  deploymentId?: string;
  buildId?: string;
  incidentId?: string;
  source?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listLogs(filters: LogFilters = {}) {
  const pageSize = filters.pageSize ?? LOG_PAGE_SIZE;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const where: Prisma.LogEntryWhereInput = {
    productId: filters.productId,
    environment: filters.environment,
    ...(filters.minLevel ? { level: { in: levelsAtLeast(filters.minLevel) } } : {}),
    requestId: filters.requestId,
    deploymentId: filters.deploymentId,
    buildId: filters.buildId,
    incidentId: filters.incidentId,
    source: filters.source,
    ...(filters.from || filters.to
      ? { timestamp: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } }
      : {}),
    ...(filters.q ? { message: { contains: filters.q, mode: "insensitive" } } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.logEntry.findMany({
      where,
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        deployment: { select: { id: true, number: true } },
        build: { select: { id: true, number: true } },
        incident: { select: { id: true, number: true, title: true } },
      },
    }),
    prisma.logEntry.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}

export async function listLogSources(productId?: string, take = 50): Promise<string[]> {
  const groups = await prisma.logEntry.groupBy({
    by: ["source"],
    where: { source: { not: null }, productId },
    orderBy: { source: "asc" },
    take,
  });
  return groups.map((g) => g.source).filter((s): s is string => Boolean(s));
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  productId?: string;
  clientId?: string;
  deploymentId?: string;
  unowned?: boolean;
  q?: string;
}

export const INCIDENT_PAGE_SIZE = 50;

export async function listIncidents(
  openOnly = false,
  filters: IncidentFilters = {},
  paging: { page?: number; pageSize?: number } = {},
) {
  const pageSize = paging.pageSize ?? INCIDENT_PAGE_SIZE;
  const page = Math.max(1, Math.floor(paging.page ?? 1));
  const where: Prisma.IncidentWhereInput = {
    ...(openOnly ? { status: { not: "RESOLVED" as const } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    severity: filters.severity,
    productId: filters.productId,
    deploymentId: filters.deploymentId,
    ...(filters.unowned ? { ownerId: null } : {}),
    ...(filters.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
    ...(filters.clientId ? { product: { clientId: filters.clientId } } : {}),
  };

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { detectedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
    prisma.incident.count({ where }),
  ]);

  return { incidents, total, page, pageSize };
}

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

export const DEPLOYMENT_PAGE_SIZE = 50;

export async function listDeploymentsPage(filters: DeploymentFilters = {}, cursor?: string) {
  const rows = await prisma.deployment.findMany({
    where: deploymentWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: DEPLOYMENT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
  const hasMore = rows.length > DEPLOYMENT_PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, DEPLOYMENT_PAGE_SIZE) : rows;
  return { entries, hasMore, nextCursor: hasMore ? (entries[entries.length - 1]?.id ?? null) : null };
}

export async function listBuildsPage(filters: BuildFilters = {}, cursor?: string) {
  const rows = await prisma.build.findMany({
    where: buildWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: DEPLOYMENT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
  const hasMore = rows.length > DEPLOYMENT_PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, DEPLOYMENT_PAGE_SIZE) : rows;
  return { entries, hasMore, nextCursor: hasMore ? (entries[entries.length - 1]?.id ?? null) : null };
}

export async function lastProductionDeployment(productId: string) {
  return prisma.deployment.findFirst({
    where: { productId, environment: "PRODUCTION", status: "SUCCEEDED" },
    orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, number: true, version: true, finishedAt: true, createdAt: true, url: true },
  });
}

export async function getDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, name: true } },
        },
      },
      build: {
        select: {
          id: true,
          number: true,
          status: true,
          branch: true,
          commitSha: true,
          commitMessage: true,
          durationMs: true,
        },
      },
      rolledBackBy: { select: { id: true, number: true, status: true } },
      rollbackOf: { select: { id: true, number: true, status: true } },
      incidents: {
        orderBy: { detectedAt: "desc" },
        select: { id: true, number: true, title: true, severity: true, status: true, detectedAt: true },
      },
      _count: { select: { logs: true } },
    },
  });
  if (!deployment) return null;

  const [previous, next] = await Promise.all([
    prisma.deployment.findFirst({
      where: {
        productId: deployment.productId,
        environment: deployment.environment,
        number: { lt: deployment.number },
      },
      orderBy: { number: "desc" },
      select: { id: true, number: true, status: true },
    }),
    prisma.deployment.findFirst({
      where: {
        productId: deployment.productId,
        environment: deployment.environment,
        number: { gt: deployment.number },
      },
      orderBy: { number: "asc" },
      select: { id: true, number: true, status: true },
    }),
  ]);

  return { ...deployment, previous, next };
}

export async function getBuild(id: string) {
  const build = await prisma.build.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, name: true } },
        },
      },
      deployments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          environment: true,
          url: true,
          finishedAt: true,
          createdAt: true,
        },
      },
      _count: { select: { logs: true } },
    },
  });
  if (!build) return null;

  const [previous, next] = await Promise.all([
    prisma.build.findFirst({
      where: { productId: build.productId, number: { lt: build.number } },
      orderBy: { number: "desc" },
      select: { id: true, number: true, status: true },
    }),
    prisma.build.findFirst({
      where: { productId: build.productId, number: { gt: build.number } },
      orderBy: { number: "asc" },
      select: { id: true, number: true, status: true },
    }),
  ]);

  return { ...build, previous, next };
}

export async function getIncident(id: string) {
  return prisma.incident.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, name: true } },
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      deployment: {
        select: {
          id: true,
          number: true,
          environment: true,
          status: true,
          version: true,
          commitSha: true,
          finishedAt: true,
          createdAt: true,
        },
      },
      updates: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      logs: {
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          level: true,
          environment: true,
          source: true,
          message: true,
          requestId: true,
          timestamp: true,
        },
      },
      _count: { select: { logs: true } },
    },
  });
}

export async function getProjectEngineering(projectId: string) {
  const products = await prisma.product.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      kind: true,
      productionUrl: true,
      stagingUrl: true,
      repositoryUrl: true,
    },
  });
  const productIds = products.map((p) => p.id);

  const [deployments, openIncidents, taskGroups] = await Promise.all([
    Promise.all(
      productIds.map((productId) =>
        prisma.deployment.findFirst({
          where: { productId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            productId: true,
            number: true,
            status: true,
            environment: true,
            version: true,
            finishedAt: true,
            createdAt: true,
          },
        }),
      ),
    ).then((rows) => rows.filter((d): d is NonNullable<typeof d> => d !== null)),
    productIds.length
      ? prisma.incident.findMany({
          where: { productId: { in: productIds }, status: { not: "RESOLVED" } },
          orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            detectedAt: true,
            product: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.projectTask.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
  ]);

  const latestByProduct = new Map(deployments.map((d) => [d.productId, d]));
  const taskCount = (status?: string) =>
    taskGroups
      .filter((g) => (status ? g.status === status : true))
      .reduce((sum, g) => sum + g._count._all, 0);
  const total = taskCount();
  const closed = taskCount("DONE") + taskCount("CANCELLED");

  return {
    products: products.map((p) => ({ ...p, latestDeployment: latestByProduct.get(p.id) ?? null })),
    openIncidents,
    tasks: { total, open: total - closed, done: taskCount("DONE") },
  };
}
