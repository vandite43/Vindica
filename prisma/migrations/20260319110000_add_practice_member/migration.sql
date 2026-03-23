-- Add practiceId to link all users (owners + employees) to a practice
ALTER TABLE "User" ADD COLUMN "practiceId" TEXT REFERENCES "Practice"("id");

-- Backfill existing practice owners: link them to their own practice
UPDATE "User" u
SET "practiceId" = p.id
FROM "Practice" p
WHERE p."userId" = u.id;
