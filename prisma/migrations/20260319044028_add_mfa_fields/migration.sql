-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaCode" TEXT,
ADD COLUMN     "mfaCodeExpiry" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mfaLockedUntil" TIMESTAMP(3),
ADD COLUMN     "mfaToken" TEXT,
ADD COLUMN     "mfaTokenExpiry" TIMESTAMP(3);
