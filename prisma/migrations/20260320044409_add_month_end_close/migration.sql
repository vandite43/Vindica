-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MONTH_END_CHECKLIST_ITEM';

-- CreateTable
CREATE TABLE "MonthEndClose" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthEndClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthEndItem" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthEndItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthEndClose_practiceId_month_year_key" ON "MonthEndClose"("practiceId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthEndItem_closeId_itemKey_key" ON "MonthEndItem"("closeId", "itemKey");

-- AddForeignKey
ALTER TABLE "MonthEndClose" ADD CONSTRAINT "MonthEndClose_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndItem" ADD CONSTRAINT "MonthEndItem_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "MonthEndClose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
