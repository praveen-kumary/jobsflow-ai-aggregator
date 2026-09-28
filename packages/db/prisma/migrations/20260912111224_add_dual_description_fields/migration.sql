-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "applyPageScraped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "descriptionFromApply" TEXT,
ADD COLUMN     "descriptionFromSource" TEXT;
