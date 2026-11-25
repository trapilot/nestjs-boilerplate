-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN "correlationId" TEXT;

-- CreateIndex
CREATE INDEX "activity_logs_correlationId_idx" ON "activity_logs"("correlationId");
