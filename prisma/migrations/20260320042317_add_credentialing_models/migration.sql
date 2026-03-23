/*
  Warnings:

  - Made the column `diagnosisCodes` on table `Claim` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('NOT_STARTED', 'APPLICATION_SENT', 'IN_PROCESS', 'CREDENTIALED', 'EXPIRED', 'TERMINATED', 'DENIED');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_practiceId_fkey";

-- AlterTable
ALTER TABLE "Claim" ALTER COLUMN "diagnosisCodes" SET NOT NULL;

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "npiType2" TEXT,
ADD COLUMN     "taxId" TEXT;

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "npiType1" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "deaNumber" TEXT,
    "specialty" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "applicationDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "contractType" TEXT,
    "providerNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialingEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "payerName" TEXT,
    "event" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialingEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialingEvent" ADD CONSTRAINT "CredentialingEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
