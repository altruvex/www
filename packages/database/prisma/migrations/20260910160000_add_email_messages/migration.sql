-- Altruvex OS: outbound transactional mail.
--
-- Adds email_messages, mirroring whatsapp_messages: both record a thing sent to
-- a client about a proposal or a contract, and a client's history is worth less
-- if the two channels are stored as different kinds of fact.
--
-- DELIVERED, BOUNCED and COMPLAINED exist in the enum but nothing in this
-- application can set them. They are reachable only from a provider webhook,
-- which is not wired up — the states are declared so the schema does not have to
-- change when it is, and no row reaches them before then.

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "EmailMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "transport" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedProposalId" TEXT,
    "relatedContractId" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_providerMessageId_key" ON "email_messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "email_messages_clientId_idx" ON "email_messages"("clientId");

-- CreateIndex
CREATE INDEX "email_messages_providerMessageId_idx" ON "email_messages"("providerMessageId");

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
