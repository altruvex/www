-- A change-request quote can be sent to the client as a link they open, review
-- and answer. The token is scoped to one request; the sent/viewed timestamps are
-- evidence the page records, never values an operator types.

-- AlterTable
ALTER TABLE "change_requests" ADD COLUMN     "clientResponseNote" TEXT,
ADD COLUMN     "quoteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "quoteSentAt" TIMESTAMP(3),
ADD COLUMN     "quoteSentVia" TEXT,
ADD COLUMN     "quoteToken" TEXT,
ADD COLUMN     "quoteViewedAt" TIMESTAMP(3),
ADD COLUMN     "respondedByName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_quoteToken_key" ON "change_requests"("quoteToken");

