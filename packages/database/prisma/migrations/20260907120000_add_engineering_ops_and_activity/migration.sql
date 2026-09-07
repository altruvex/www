-- Altruvex OS: engineering operations, activity trail, delivery tasks and the
-- subscription billing lifecycle.
--
-- Adds: activity_events (a written audit trail, replacing the derived one),
-- products/builds/deployments/log_entries/incidents/incident_updates (the
-- engineering side of the OS, fed by CI through /api/ingest/*), project_tasks
-- (real work items, replacing a synthesised board), and renewal/period columns
-- on maintenance_subscriptions.

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('USER', 'CLIENT', 'SYSTEM', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('WEBSITE', 'WEB_APP', 'API', 'ECOMMERCE', 'LANDING_PAGE', 'INTERNAL_TOOL');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PLANNED', 'IN_DEVELOPMENT', 'LIVE', 'MAINTENANCE', 'SUNSET');

-- CreateEnum
CREATE TYPE "DeployEnvironment" AS ENUM ('PRODUCTION', 'STAGING', 'PREVIEW');

-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceSubscriptionStatus" ADD VALUE 'TRIALING';
ALTER TYPE "MaintenanceSubscriptionStatus" ADD VALUE 'PAST_DUE';
ALTER TYPE "MaintenanceSubscriptionStatus" ADD VALUE 'GRACE';
ALTER TYPE "MaintenanceSubscriptionStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "MaintenanceSubscriptionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
-- `currentPeriodEnd` is NOT NULL but existing retainers have no recorded period.
-- Add it nullable, backfill from the billing anchor, then enforce. Adding it
-- NOT NULL in one step (what `migrate diff` emits) fails on any live row.
ALTER TABLE "maintenance_subscriptions" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastRenewedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- Existing rows are billed monthly from `startedAt`. Roll that anchor forward to
-- the first period boundary that has not yet passed, so nothing lands in the
-- renewals screen already overdue on the day this ships.
UPDATE "maintenance_subscriptions" AS ms
SET "currentPeriodStart" = ms."startedAt" + make_interval(months => sub.elapsed_months),
    "currentPeriodEnd"   = ms."startedAt" + make_interval(months => sub.elapsed_months + 1)
FROM (
  SELECT
    "id",
    GREATEST(0, (
      (DATE_PART('year', NOW()) - DATE_PART('year', "startedAt")) * 12
      + (DATE_PART('month', NOW()) - DATE_PART('month', "startedAt"))
      - CASE WHEN DATE_PART('day', NOW()) < DATE_PART('day', "startedAt") THEN 1 ELSE 0 END
    )::int) AS elapsed_months
  FROM "maintenance_subscriptions"
) AS sub
WHERE ms."id" = sub."id" AND ms."currentPeriodEnd" IS NULL;

ALTER TABLE "maintenance_subscriptions" ALTER COLUMN "currentPeriodEnd" SET NOT NULL;

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorKind" "ActorKind" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL DEFAULT 'WEBSITE',
    "status" "ProductStatus" NOT NULL DEFAULT 'PLANNED',
    "productionUrl" TEXT,
    "stagingUrl" TEXT,
    "repositoryUrl" TEXT,
    "framework" TEXT,
    "hostingProvider" TEXT,
    "ingestTokenHash" TEXT,
    "ingestTokenLast4" TEXT,
    "ingestTokenIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "environment" "DeployEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "status" "BuildStatus" NOT NULL DEFAULT 'QUEUED',
    "number" INTEGER NOT NULL,
    "externalId" TEXT,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "branch" TEXT,
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buildId" TEXT,
    "environment" "DeployEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "number" INTEGER NOT NULL,
    "externalId" TEXT,
    "version" TEXT,
    "commitSha" TEXT,
    "url" TEXT,
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "rolledBackById" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "environment" "DeployEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" TEXT,
    "message" TEXT NOT NULL,
    "requestId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buildId" TEXT,
    "deploymentId" TEXT,
    "incidentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deploymentId" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'SEV3',
    "status" "IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "ownerId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "IncidentStatus",
    "body" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "phase" "ProjectPhase",
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_entityType_entityId_createdAt_idx" ON "activity_events"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");

-- CreateIndex
CREATE INDEX "activity_events_action_createdAt_idx" ON "activity_events"("action", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_actorId_idx" ON "activity_events"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_ingestTokenHash_key" ON "products"("ingestTokenHash");

-- CreateIndex
CREATE INDEX "products_clientId_idx" ON "products"("clientId");

-- CreateIndex
CREATE INDEX "products_projectId_idx" ON "products"("projectId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "builds_productId_createdAt_idx" ON "builds"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "builds_status_idx" ON "builds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "builds_productId_number_key" ON "builds"("productId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "builds_productId_externalId_key" ON "builds"("productId", "externalId");

-- CreateIndex
CREATE INDEX "deployments_productId_createdAt_idx" ON "deployments"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "deployments_environment_createdAt_idx" ON "deployments"("environment", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_productId_number_key" ON "deployments"("productId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_productId_externalId_key" ON "deployments"("productId", "externalId");

-- CreateIndex
CREATE INDEX "log_entries_productId_timestamp_idx" ON "log_entries"("productId", "timestamp");

-- CreateIndex
CREATE INDEX "log_entries_productId_level_timestamp_idx" ON "log_entries"("productId", "level", "timestamp");

-- CreateIndex
CREATE INDEX "log_entries_buildId_timestamp_idx" ON "log_entries"("buildId", "timestamp");

-- CreateIndex
CREATE INDEX "log_entries_deploymentId_timestamp_idx" ON "log_entries"("deploymentId", "timestamp");

-- CreateIndex
CREATE INDEX "log_entries_requestId_idx" ON "log_entries"("requestId");

-- CreateIndex
CREATE INDEX "incidents_status_severity_idx" ON "incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "incidents_productId_detectedAt_idx" ON "incidents"("productId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_productId_number_key" ON "incidents"("productId", "number");

-- CreateIndex
CREATE INDEX "incident_updates_incidentId_createdAt_idx" ON "incident_updates"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_status_idx" ON "project_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_tasks_assigneeId_status_idx" ON "project_tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "project_tasks_dueDate_idx" ON "project_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "maintenance_subscriptions_currentPeriodEnd_idx" ON "maintenance_subscriptions"("currentPeriodEnd");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_rolledBackById_fkey" FOREIGN KEY ("rolledBackById") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

