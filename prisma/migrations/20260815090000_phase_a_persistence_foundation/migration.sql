-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "CaseSource" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "KpiMeasurement" ADD COLUMN     "seedKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "personaKey" TEXT;

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "seedKey" TEXT;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seedKey" TEXT,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_tenantId_idx" ON "Comment"("tenantId");

-- CreateIndex
CREATE INDEX "Comment_caseId_createdAt_idx" ON "Comment"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_tenantId_seedKey_key" ON "Comment"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_tenantId_seedKey_key" ON "AuditEvent"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Case_tenantId_seedKey_key" ON "Case"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "CaseSource_tenantId_seedKey_key" ON "CaseSource"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_tenantId_seedKey_key" ON "CorrectiveAction"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_tenantId_seedKey_key" ON "Evidence"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "KpiMeasurement_tenantId_seedKey_key" ON "KpiMeasurement"("tenantId", "seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_personaKey_key" ON "User"("tenantId", "personaKey");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_tenantId_seedKey_key" ON "Verification"("tenantId", "seedKey");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
