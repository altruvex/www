-- The www contact form now requires an email address. The column is nullable
-- because submissions received before this change were collected without one.
-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");
