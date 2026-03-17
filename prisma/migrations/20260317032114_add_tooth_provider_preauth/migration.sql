-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "preAuthNumber" TEXT,
ADD COLUMN     "providerNpi" TEXT,
ADD COLUMN     "toothNumbers" TEXT[];
