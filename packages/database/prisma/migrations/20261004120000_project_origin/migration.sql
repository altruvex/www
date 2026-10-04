-- A project recorded by hand (a past engagement with no proposal and no
-- contract) needs `contractId` nullable, an `origin` that says which route
-- opened it, and a `currency` of its own because it has no proposal to read
-- one from. Existing rows keep origin CONTRACT and a null currency. The
-- contract foreign key keeps ON DELETE RESTRICT on purpose.

-- CreateEnum
CREATE TYPE "ProjectOrigin" AS ENUM ('CONTRACT', 'RECORDED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "origin" "ProjectOrigin" NOT NULL DEFAULT 'CONTRACT',
ALTER COLUMN "contractId" DROP NOT NULL;
