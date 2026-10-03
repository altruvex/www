-- AlterTable
ALTER TABLE "transparency_leads" ADD COLUMN     "scopeNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "note" TEXT;
