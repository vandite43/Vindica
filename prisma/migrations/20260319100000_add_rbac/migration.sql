-- Add isActive column
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create new Role enum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OFFICE_MANAGER', 'BILLER', 'PROVIDER');

-- Add temp column with new enum type
ALTER TABLE "User" ADD COLUMN "role_new" "Role" NOT NULL DEFAULT 'BILLER';

-- Map existing values: ADMIN stays ADMIN, USER becomes BILLER
UPDATE "User" SET "role_new" = 'ADMIN'::"Role" WHERE role::text = 'ADMIN';
UPDATE "User" SET "role_new" = 'BILLER'::"Role" WHERE role::text = 'USER';

-- Drop old role column and enum
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";

-- Rename new column to role
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";

-- Add UPDATE_USER_ROLE to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_USER_ROLE';
