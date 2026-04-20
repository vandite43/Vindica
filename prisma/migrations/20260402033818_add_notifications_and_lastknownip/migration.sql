-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FAILED_LOGIN', 'NEW_DEVICE_LOGIN', 'NEW_USER_ADDED', 'ROLE_CHANGED', 'MFA_DISABLED', 'AR_THRESHOLD_30', 'AR_THRESHOLD_60', 'AR_THRESHOLD_90', 'HIGH_VALUE_CLAIM_UNPAID');

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "notificationPrefs" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastKnownIp" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_practiceId_type_sentAt_idx" ON "Notification"("practiceId", "type", "sentAt" DESC);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
