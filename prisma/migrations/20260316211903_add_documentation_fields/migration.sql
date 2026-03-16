-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "narrativeIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perioCharting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preAuthObtained" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xraysAttached" BOOLEAN NOT NULL DEFAULT false;
