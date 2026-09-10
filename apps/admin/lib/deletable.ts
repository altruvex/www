import { prisma } from "@repo/database";

import type { Subject } from "@/lib/rbac";

/**
 * The delete registry.
 *
 * Deleting a row in this system is never a single `DELETE FROM`. A client owns
 * proposals, which own contracts, which own a project, which owns payments and
 * tasks — and Prisma's default referential action on those required relations
 * is RESTRICT, so a naive delete fails with a foreign-key error an operator
 * cannot act on. Every entity therefore declares three things here:
 *
 *  1. **What goes with it** (`impact`) — shown before the operator confirms,
 *     so "delete this client" never silently destroys a signed contract.
 *  2. **Whether it may go at all** (`block`) — a signed contract, a collected
 *     payment and a CI-written build are records of something that actually
 *     happened. A soft block is refused for everyone below OWNER; a hard block
 *     is refused for everyone, because the database would refuse it anyway.
 *  3. **A snapshot** — the fields written into the audit event *before* the row
 *     stops existing. A deletion nobody can reconstruct is not auditable.
 *
 * Deletes are hard: the row leaves Postgres. The audit trail, not a `deletedAt`
 * column, is what survives it.
 */

export interface DeletionImpact {
  label: string;
  count: number;
}

export interface DeletionBlock {
  reason: string;
  /** Hard blocks cannot be forced — the database itself would refuse. */
  hard: boolean;
}

export interface DeletionPlan {
  entity: string;
  id: string;
  /** How the record is named back to the operator, and in the audit trail. */
  label: string;
  impact: DeletionImpact[];
  block: DeletionBlock | null;
  snapshot: Record<string, unknown>;
  /** Consequences that are not deletions — a foreign key that goes null. */
  notes: string[];
}

export interface Deletable {
  subject: Subject;
  noun: string;
  plural: string;
  /** Paths refreshed after a successful delete. */
  revalidate: string[];
  plan: (id: string) => Promise<DeletionPlan | null>;
  remove: (id: string) => Promise<void>;
}

function impacts(...entries: [string, number][]): DeletionImpact[] {
  return entries
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }));
}

const CI_RECORD =
  "Written by the build pipeline as the record of what actually shipped, not by this app.";

export const DELETABLES: Record<string, Deletable> = {
  /* ---------------------------------------------------------------- client */
  client: {
    subject: "client",
    noun: "client",
    plural: "clients",
    revalidate: [
      "/clients",
      "/leads",
      "/pipeline",
      "/proposals",
      "/contracts",
      "/projects",
      "/payments",
      "/invoices",
      "/products",
      "/maintenance",
      "/whatsapp",
      "/documents",
    ],
    async plan(id) {
      const row = await prisma.client.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          email: true,
          status: true,
          source: true,
          createdAt: true,
          _count: {
            select: {
              proposals: true,
              contracts: true,
              projects: true,
              messages: true,
              subscriptions: true,
              products: true,
            },
          },
        },
      });
      if (!row) return null;

      const [payments, tasks, signedContracts, paidPayments] =
        await Promise.all([
          prisma.payment.count({ where: { project: { clientId: id } } }),
          prisma.projectTask.count({ where: { project: { clientId: id } } }),
          prisma.contract.count({ where: { clientId: id, status: "SIGNED" } }),
          prisma.payment.count({
            where: { project: { clientId: id }, status: "PAID" },
          }),
        ]);

      const evidence: string[] = [];
      if (signedContracts > 0) {
        evidence.push(
          `${signedContracts} signed contract${signedContracts === 1 ? "" : "s"}`,
        );
      }
      if (paidPayments > 0) {
        evidence.push(
          `${paidPayments} collected payment${paidPayments === 1 ? "" : "s"}`,
        );
      }

      return {
        entity: "client",
        id,
        label: row.company || row.name || row.phone,
        impact: impacts(
          ["Proposals", row._count.proposals],
          ["Contracts", row._count.contracts],
          ["Projects", row._count.projects],
          ["Payments", payments],
          ["Delivery tasks", tasks],
          ["Products", row._count.products],
          ["Maintenance subscriptions", row._count.subscriptions],
          ["WhatsApp messages", row._count.messages],
        ),
        block:
          evidence.length > 0
            ? {
                reason: `This client holds ${evidence.join(" and ")}. Those are financial and legal records of work that happened.`,
                hard: false,
              }
            : null,
        snapshot: {
          name: row.name,
          company: row.company,
          phone: row.phone,
          email: row.email,
          status: row.status,
          source: row.source,
          createdAt: row.createdAt,
        },
        notes: [
          "The form submission or estimate this client came from is kept — only the CRM record goes.",
        ],
      };
    },
    async remove(id) {
      await prisma.$transaction(async (tx) => {
        const projects = await tx.project.findMany({
          where: { clientId: id },
          select: { id: true },
        });
        const projectIds = projects.map((p) => p.id);
        if (projectIds.length > 0) {
          await tx.payment.deleteMany({
            where: { projectId: { in: projectIds } },
          });
        }
        // Products cascade their builds, deployments, logs and incidents.
        await tx.product.deleteMany({ where: { clientId: id } });
        // Projects cascade their tasks.
        await tx.project.deleteMany({ where: { clientId: id } });
        await tx.contract.deleteMany({ where: { clientId: id } });
        await tx.proposal.deleteMany({ where: { clientId: id } });
        await tx.whatsAppMessage.deleteMany({ where: { clientId: id } });
        // Subscriptions cascade their requests.
        await tx.maintenanceSubscription.deleteMany({
          where: { clientId: id },
        });
        await tx.client.delete({ where: { id } });
      });
    },
  },

  /* ------------------------------------------------------------ submission */
  submission: {
    subject: "lead",
    noun: "form submission",
    plural: "form submissions",
    revalidate: ["/submissions", "/inbox", "/leads", "/clients"],
    async plan(id) {
      const row = await prisma.contactSubmission.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          phone: true,
          message: true,
          status: true,
          locale: true,
          utmSource: true,
          submittedAt: true,
          client: { select: { id: true } },
          _count: { select: { notes: true, tags: true, meetings: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "submission",
        id,
        label: row.name,
        impact: impacts(
          ["Internal notes", row._count.notes],
          ["Tags", row._count.tags],
        ),
        block: null,
        snapshot: {
          name: row.name,
          phone: row.phone,
          message: row.message,
          status: row.status,
          locale: row.locale,
          utmSource: row.utmSource,
          submittedAt: row.submittedAt,
        },
        notes: [
          ...(row.client
            ? [
                "The client record created from it stays, and loses its link to the original words.",
              ]
            : []),
          ...(row._count.meetings > 0
            ? [
                `${row._count.meetings} meeting${row._count.meetings === 1 ? "" : "s"} stay${row._count.meetings === 1 ? "s" : ""} on the calendar, unlinked.`,
              ]
            : []),
        ],
      };
    },
    async remove(id) {
      // Notes and tags cascade.
      await prisma.contactSubmission.delete({ where: { id } });
    },
  },

  /* ------------------------------------------------------ transparency lead */
  transparencyLead: {
    subject: "lead",
    noun: "estimate",
    plural: "estimates",
    revalidate: ["/transparency", "/leads", "/clients"],
    async plan(id) {
      const row = await prisma.transparencyLead.findUnique({
        where: { id },
        select: {
          id: true,
          reference: true,
          name: true,
          phone: true,
          projectType: true,
          complexity: true,
          priceMin: true,
          priceMax: true,
          createdAt: true,
          client: { select: { id: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "transparencyLead",
        id,
        label: row.reference,
        impact: [],
        block: null,
        snapshot: {
          reference: row.reference,
          name: row.name,
          phone: row.phone,
          projectType: row.projectType,
          complexity: row.complexity,
          priceMin: row.priceMin,
          priceMax: row.priceMax,
          createdAt: row.createdAt,
        },
        notes: row.client
          ? [
              "The client converted from this estimate stays, and loses its link to the numbers.",
            ]
          : [],
      };
    },
    async remove(id) {
      await prisma.transparencyLead.delete({ where: { id } });
    },
  },

  /* -------------------------------------------------------------- proposal */
  proposal: {
    subject: "proposal",
    noun: "proposal",
    plural: "proposals",
    revalidate: [
      "/proposals",
      "/clients",
      "/contracts",
      "/documents",
      "/pipeline",
    ],
    async plan(id) {
      const row = await prisma.proposal.findUnique({
        where: { id },
        select: {
          id: true,
          projectType: true,
          complexity: true,
          totalPrice: true,
          currency: true,
          status: true,
          sentAt: true,
          createdAt: true,
          client: { select: { name: true, company: true } },
          contract: {
            select: {
              id: true,
              status: true,
              project: { select: { id: true } },
            },
          },
        },
      });
      if (!row) return null;

      const projectId = row.contract?.project?.id;
      const [payments, tasks] = projectId
        ? await Promise.all([
            prisma.payment.count({ where: { projectId } }),
            prisma.projectTask.count({ where: { projectId } }),
          ])
        : [0, 0];
      const paidPayments = projectId
        ? await prisma.payment.count({ where: { projectId, status: "PAID" } })
        : 0;

      const signed = row.contract?.status === "SIGNED";
      return {
        entity: "proposal",
        id,
        label: `${row.projectType} · ${row.client.company || row.client.name || "Client"}`,
        impact: impacts(
          ["Contracts", row.contract ? 1 : 0],
          ["Projects", projectId ? 1 : 0],
          ["Payments", payments],
          ["Delivery tasks", tasks],
        ),
        block:
          signed || paidPayments > 0
            ? {
                reason: signed
                  ? "Its contract is signed. Deleting the proposal destroys the document that contract was agreed from."
                  : "Payments have already been collected against the project this proposal produced.",
                hard: false,
              }
            : null,
        snapshot: {
          projectType: row.projectType,
          complexity: row.complexity,
          totalPrice: row.totalPrice,
          currency: row.currency,
          status: row.status,
          sentAt: row.sentAt,
          createdAt: row.createdAt,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.$transaction(async (tx) => {
        const contract = await tx.contract.findUnique({
          where: { proposalId: id },
          select: { id: true, project: { select: { id: true } } },
        });
        if (contract?.project) {
          await tx.payment.deleteMany({
            where: { projectId: contract.project.id },
          });
          await tx.project.delete({ where: { id: contract.project.id } });
        }
        if (contract) await tx.contract.delete({ where: { id: contract.id } });
        await tx.proposal.delete({ where: { id } });
      });
    },
  },

  /* -------------------------------------------------------------- contract */
  contract: {
    subject: "contract",
    noun: "contract",
    plural: "contracts",
    revalidate: [
      "/contracts",
      "/clients",
      "/projects",
      "/documents",
      "/pipeline",
    ],
    async plan(id) {
      const row = await prisma.contract.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          signedAt: true,
          signedByName: true,
          createdAt: true,
          client: { select: { name: true, company: true } },
          proposal: {
            select: { projectType: true, totalPrice: true, currency: true },
          },
          project: { select: { id: true } },
        },
      });
      if (!row) return null;

      const projectId = row.project?.id;
      const [payments, tasks, paidPayments] = projectId
        ? await Promise.all([
            prisma.payment.count({ where: { projectId } }),
            prisma.projectTask.count({ where: { projectId } }),
            prisma.payment.count({ where: { projectId, status: "PAID" } }),
          ])
        : [0, 0, 0];

      return {
        entity: "contract",
        id,
        label: `${row.proposal.projectType} · ${row.client.company || row.client.name || "Client"}`,
        impact: impacts(
          ["Projects", projectId ? 1 : 0],
          ["Payments", payments],
          ["Delivery tasks", tasks],
        ),
        block:
          row.status === "SIGNED" || paidPayments > 0
            ? {
                reason:
                  row.status === "SIGNED"
                    ? `Signed${row.signedByName ? ` by ${row.signedByName}` : ""}. A signed agreement is a legal record, not a draft.`
                    : "Payments have already been collected against this contract's project.",
                hard: false,
              }
            : null,
        snapshot: {
          status: row.status,
          signedAt: row.signedAt,
          signedByName: row.signedByName,
          projectType: row.proposal.projectType,
          totalPrice: row.proposal.totalPrice,
          currency: row.proposal.currency,
          createdAt: row.createdAt,
        },
        notes: ["The proposal it was generated from is kept."],
      };
    },
    async remove(id) {
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
          where: { contractId: id },
          select: { id: true },
        });
        if (project) {
          await tx.payment.deleteMany({ where: { projectId: project.id } });
          await tx.project.delete({ where: { id: project.id } });
        }
        await tx.contract.delete({ where: { id } });
      });
    },
  },

  /* --------------------------------------------------------------- project */
  project: {
    subject: "project",
    noun: "project",
    plural: "projects",
    revalidate: [
      "/projects",
      "/clients",
      "/payments",
      "/invoices",
      "/tasks",
      "/products",
    ],
    async plan(id) {
      const row = await prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          phase: true,
          status: true,
          liveUrl: true,
          targetLaunchDate: true,
          createdAt: true,
          _count: { select: { payments: true, tasks: true, products: true } },
        },
      });
      if (!row) return null;
      const paidPayments = await prisma.payment.count({
        where: { projectId: id, status: "PAID" },
      });
      return {
        entity: "project",
        id,
        label: row.name,
        impact: impacts(
          ["Payments", row._count.payments],
          ["Delivery tasks", row._count.tasks],
        ),
        block:
          paidPayments > 0
            ? {
                reason: `${paidPayments} payment${paidPayments === 1 ? " has" : "s have"} been collected against this project.`,
                hard: false,
              }
            : null,
        snapshot: {
          name: row.name,
          phase: row.phase,
          status: row.status,
          liveUrl: row.liveUrl,
          targetLaunchDate: row.targetLaunchDate,
          createdAt: row.createdAt,
        },
        notes:
          row._count.products > 0
            ? [
                `${row._count.products} product${row._count.products === 1 ? "" : "s"} stay${row._count.products === 1 ? "s" : ""} operated — a product outlives the project that built it.`,
              ]
            : [],
      };
    },
    async remove(id) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { projectId: id } });
        // Tasks cascade; products fall back to no project.
        await tx.project.delete({ where: { id } });
      });
    },
  },

  /* --------------------------------------------------------------- payment */
  payment: {
    subject: "payment",
    noun: "payment",
    plural: "payments",
    revalidate: ["/payments", "/invoices", "/projects"],
    async plan(id) {
      const row = await prisma.payment.findUnique({
        where: { id },
        select: {
          id: true,
          milestone: true,
          amount: true,
          status: true,
          dueDate: true,
          paidAt: true,
          reference: true,
          project: { select: { name: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "payment",
        id,
        label: `${row.milestone.replace(/_/g, " ").toLowerCase()} · ${row.project.name}`,
        impact: [],
        block:
          row.status === "PAID"
            ? {
                reason:
                  "This payment was collected. Deleting it removes money the books recorded.",
                hard: false,
              }
            : null,
        snapshot: {
          milestone: row.milestone,
          amount: row.amount,
          status: row.status,
          dueDate: row.dueDate,
          paidAt: row.paidAt,
          reference: row.reference,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.payment.delete({ where: { id } });
    },
  },

  /* --------------------------------------------------------------- meeting */
  meeting: {
    subject: "meeting",
    noun: "meeting",
    plural: "meetings",
    revalidate: ["/calendar", "/meetings", "/inbox"],
    async plan(id) {
      const row = await prisma.meeting.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          guestName: true,
          guestEmail: true,
        },
      });
      if (!row) return null;
      return {
        entity: "meeting",
        id,
        label: row.title,
        impact: [],
        block: null,
        snapshot: {
          title: row.title,
          type: row.type,
          status: row.status,
          scheduledDate: row.scheduledDate,
          scheduledTime: row.scheduledTime,
          guestName: row.guestName,
          guestEmail: row.guestEmail,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.meeting.delete({ where: { id } });
    },
  },

  /* ------------------------------------------------------------------ task */
  task: {
    subject: "project",
    noun: "task",
    plural: "tasks",
    revalidate: ["/tasks", "/projects"],
    async plan(id) {
      const row = await prisma.projectTask.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          phase: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "task",
        id,
        label: row.title,
        impact: [],
        block: null,
        snapshot: {
          title: row.title,
          status: row.status,
          priority: row.priority,
          phase: row.phase,
          dueDate: row.dueDate,
          project: row.project.name,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.projectTask.delete({ where: { id } });
    },
  },

  /* --------------------------------------------------------------- product */
  product: {
    subject: "project",
    noun: "product",
    plural: "products",
    revalidate: ["/products", "/deployments", "/logs", "/incidents", "/health"],
    async plan(id) {
      const row = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          status: true,
          productionUrl: true,
          client: { select: { name: true, company: true } },
          _count: {
            select: {
              builds: true,
              deployments: true,
              logs: true,
              incidents: true,
            },
          },
        },
      });
      if (!row) return null;
      const history =
        row._count.builds + row._count.deployments + row._count.logs;
      return {
        entity: "product",
        id,
        label: row.name,
        impact: impacts(
          ["Builds", row._count.builds],
          ["Deployments", row._count.deployments],
          ["Log entries", row._count.logs],
          ["Incidents", row._count.incidents],
        ),
        block:
          history > 0
            ? {
                reason: `${history} pipeline record${history === 1 ? "" : "s"} belong to this product. ${CI_RECORD}`,
                hard: false,
              }
            : null,
        snapshot: {
          name: row.name,
          slug: row.slug,
          kind: row.kind,
          status: row.status,
          productionUrl: row.productionUrl,
          client: row.client.company || row.client.name,
        },
        notes: [
          "Its ingest token stops working. A pipeline still posting to it starts failing authentication.",
        ],
      };
    },
    async remove(id) {
      // Builds, deployments, logs and incidents all cascade from the product.
      await prisma.product.delete({ where: { id } });
    },
  },

  /* ----------------------------------------------------------------- build */
  build: {
    subject: "project",
    noun: "build",
    plural: "builds",
    revalidate: ["/deployments", "/products", "/health"],
    async plan(id) {
      const row = await prisma.build.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          status: true,
          environment: true,
          branch: true,
          commitSha: true,
          product: { select: { name: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "build",
        id,
        label: `${row.product.name} · build ${row.number}`,
        impact: [],
        block: { reason: CI_RECORD, hard: false },
        snapshot: {
          number: row.number,
          status: row.status,
          environment: row.environment,
          branch: row.branch,
          commitSha: row.commitSha,
          product: row.product.name,
        },
        notes: [
          "Deployments made from this build keep their own rows and lose the link.",
        ],
      };
    },
    async remove(id) {
      await prisma.build.delete({ where: { id } });
    },
  },

  /* ------------------------------------------------------------ deployment */
  deployment: {
    subject: "project",
    noun: "deployment",
    plural: "deployments",
    revalidate: ["/deployments", "/products", "/health"],
    async plan(id) {
      const row = await prisma.deployment.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          status: true,
          environment: true,
          version: true,
          product: { select: { name: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "deployment",
        id,
        label: `${row.product.name} · deployment ${row.number}`,
        impact: [],
        block: { reason: CI_RECORD, hard: false },
        snapshot: {
          number: row.number,
          status: row.status,
          environment: row.environment,
          version: row.version,
          product: row.product.name,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.deployment.delete({ where: { id } });
    },
  },

  /* ------------------------------------------------------------------- log */
  log: {
    subject: "project",
    noun: "log entry",
    plural: "log entries",
    revalidate: ["/logs"],
    async plan(id) {
      const row = await prisma.logEntry.findUnique({
        where: { id },
        select: {
          id: true,
          level: true,
          message: true,
          source: true,
          environment: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "log",
        id,
        label: row.message.slice(0, 80),
        impact: [],
        block: { reason: CI_RECORD, hard: false },
        snapshot: {
          level: row.level,
          message: row.message,
          source: row.source,
          environment: row.environment,
          product: row.product.name,
          createdAt: row.createdAt,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.logEntry.delete({ where: { id } });
    },
  },

  /* -------------------------------------------------------------- incident */
  incident: {
    subject: "project",
    noun: "incident",
    plural: "incidents",
    revalidate: ["/incidents", "/health", "/products"],
    async plan(id) {
      const row = await prisma.incident.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          status: true,
          detectedAt: true,
          resolvedAt: true,
          product: { select: { name: true } },
          _count: { select: { updates: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "incident",
        id,
        label: `#${row.number} ${row.title}`,
        impact: impacts(["Incident updates", row._count.updates]),
        block: null,
        snapshot: {
          number: row.number,
          title: row.title,
          severity: row.severity,
          status: row.status,
          detectedAt: row.detectedAt,
          resolvedAt: row.resolvedAt,
          product: row.product.name,
        },
        notes: [],
      };
    },
    async remove(id) {
      // Updates cascade.
      await prisma.incident.delete({ where: { id } });
    },
  },

  /* --------------------------------------------- maintenance subscription */
  maintenanceSubscription: {
    subject: "client",
    noun: "retainer",
    plural: "retainers",
    revalidate: ["/maintenance", "/clients"],
    async plan(id) {
      const row = await prisma.maintenanceSubscription.findUnique({
        where: { id },
        select: {
          id: true,
          planId: true,
          status: true,
          billingInterval: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          autoRenew: true,
          client: { select: { name: true, company: true } },
          _count: { select: { requests: true } },
        },
      });
      if (!row) return null;
      return {
        entity: "maintenanceSubscription",
        id,
        label: `${row.planId} · ${row.client.company || row.client.name || "Client"}`,
        impact: impacts(["Client requests", row._count.requests]),
        block:
          row.status === "ACTIVE" || row.status === "TRIALING"
            ? {
                reason:
                  "This retainer is live. Deleting it loses the billing anchor and the client's portal link stops resolving. Cancel it instead — a cancelled retainer keeps its history.",
                hard: false,
              }
            : null,
        snapshot: {
          planId: row.planId,
          status: row.status,
          billingInterval: row.billingInterval,
          currentPeriodStart: row.currentPeriodStart,
          currentPeriodEnd: row.currentPeriodEnd,
          autoRenew: row.autoRenew,
          client: row.client.company || row.client.name,
        },
        notes: [],
      };
    },
    async remove(id) {
      // Requests cascade.
      await prisma.maintenanceSubscription.delete({ where: { id } });
    },
  },

  /* -------------------------------------------------- maintenance request */
  maintenanceRequest: {
    subject: "client",
    noun: "maintenance request",
    plural: "maintenance requests",
    revalidate: ["/maintenance"],
    async plan(id) {
      const row = await prisma.maintenanceRequest.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          status: true,
          cycleStart: true,
          countsToCap: true,
          createdAt: true,
        },
      });
      if (!row) return null;
      return {
        entity: "maintenanceRequest",
        id,
        label: row.title,
        impact: [],
        block: null,
        snapshot: {
          title: row.title,
          status: row.status,
          cycleStart: row.cycleStart,
          countsToCap: row.countsToCap,
          createdAt: row.createdAt,
        },
        notes: row.countsToCap
          ? [
              "It stops counting against this cycle's allowance, which frees one request.",
            ]
          : [],
      };
    },
    async remove(id) {
      await prisma.maintenanceRequest.delete({ where: { id } });
    },
  },

  /* ---------------------------------------------------------------- note */
  note: {
    subject: "lead",
    noun: "note",
    plural: "notes",
    revalidate: ["/submissions", "/inbox"],
    async plan(id) {
      const row = await prisma.contactNote.findUnique({
        where: { id },
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          submissionId: true,
        },
      });
      if (!row) return null;
      return {
        entity: "note",
        id,
        label: row.content.slice(0, 60),
        impact: [],
        block: null,
        snapshot: {
          content: row.content,
          type: row.type,
          createdAt: row.createdAt,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.contactNote.delete({ where: { id } });
    },
  },

  /* --------------------------------------------------------- notification */
  notification: {
    subject: "client",
    noun: "notification",
    plural: "notifications",
    revalidate: ["/notifications"],
    async plan(id) {
      const row = await prisma.notification.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          title: true,
          read: true,
          createdAt: true,
        },
      });
      if (!row) return null;
      return {
        entity: "notification",
        id,
        label: row.title,
        impact: [],
        block: null,
        snapshot: {
          type: row.type,
          title: row.title,
          read: row.read,
          createdAt: row.createdAt,
        },
        notes: [],
      };
    },
    async remove(id) {
      await prisma.notification.delete({ where: { id } });
    },
  },

  /* ------------------------------------------------------------------ user */
  user: {
    subject: "team",
    noun: "team member",
    plural: "team members",
    revalidate: ["/team", "/settings"],
    async plan(id) {
      const row = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
      if (!row) return null;

      const [notes, superadmins] = await Promise.all([
        prisma.contactNote.count({ where: { createdById: id } }),
        prisma.user.count({ where: { role: "SUPERADMIN" } }),
      ]);

      let block: DeletionBlock | null = null;
      if (notes > 0) {
        block = {
          reason: `This person wrote ${notes} internal note${notes === 1 ? "" : "s"}. Notes are attributed, so the account cannot be removed without destroying that attribution.`,
          hard: true,
        };
      } else if (row.role === "SUPERADMIN" && superadmins <= 1) {
        block = {
          reason:
            "The last superadmin. Removing it locks everyone out of this app.",
          hard: true,
        };
      }

      return {
        entity: "user",
        id,
        label: row.name || row.email,
        impact: [],
        block,
        snapshot: {
          name: row.name,
          email: row.email,
          role: row.role,
          createdAt: row.createdAt,
        },
        notes: [
          "Their sessions end immediately.",
          "Work they were assigned — tasks, meetings, incidents — stays and becomes unassigned.",
        ],
      };
    },
    async remove(id) {
      // Sessions and accounts cascade; assignments fall back to null.
      await prisma.user.delete({ where: { id } });
    },
  },
};

export type DeletableEntity = keyof typeof DELETABLES;

export function getDeletable(entity: string): Deletable {
  const deletable = DELETABLES[entity];
  if (!deletable)
    throw new Error(`Nothing registered as deletable for “${entity}”`);
  return deletable;
}
