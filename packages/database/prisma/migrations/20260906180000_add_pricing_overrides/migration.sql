-- CreateTable
CREATE TABLE "pricing_cell_overrides" (
    "serviceId" TEXT NOT NULL,
    "complexityId" TEXT NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "weeksMin" INTEGER NOT NULL,
    "weeksMax" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_cell_overrides_pkey" PRIMARY KEY ("serviceId","complexityId")
);

-- CreateTable
CREATE TABLE "maintenance_plan_overrides" (
    "id" TEXT NOT NULL,
    "price" INTEGER,
    "requestsPerCycle" INTEGER,
    "overageHourlyRate" INTEGER,
    "internalHourEquivalent" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plan_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulting_package_overrides" (
    "id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "durationBusinessDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consulting_package_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_overrides" (
    "id" TEXT NOT NULL,
    "costBasis" INTEGER,
    "markupType" TEXT NOT NULL DEFAULT 'percent',
    "markupValue" INTEGER NOT NULL DEFAULT 0,
    "billingCycle" TEXT NOT NULL DEFAULT 'annual',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_terms_overrides" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "vatRate" DOUBLE PRECISION NOT NULL,
    "revisionHourlyRate" INTEGER NOT NULL,
    "revisionHourlyRateUsd" INTEGER NOT NULL,
    "includedRevisionRounds" INTEGER NOT NULL,
    "paymentSplitFirst" INTEGER NOT NULL,
    "paymentSplitSecond" INTEGER NOT NULL,
    "paymentSplitFinal" INTEGER NOT NULL,
    "proposalValidityDays" INTEGER NOT NULL,
    "postLaunchWarrantyDays" INTEGER NOT NULL,
    "usdEgpRate" INTEGER NOT NULL,
    "usdRateReviewedOn" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_terms_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_change_log" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_change_log_entityType_entityId_idx" ON "pricing_change_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "pricing_change_log_createdAt_idx" ON "pricing_change_log"("createdAt");

