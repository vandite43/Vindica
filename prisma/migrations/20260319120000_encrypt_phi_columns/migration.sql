-- Convert patientDob from TIMESTAMP to TEXT so encrypted strings can be stored.
-- Existing plaintext values are preserved as ISO timestamp strings;
-- safeDecrypt() will return them as-is until re-encrypted.
ALTER TABLE "Claim" ALTER COLUMN "patientDob" TYPE TEXT USING "patientDob"::TEXT;

-- Convert diagnosisCodes from TEXT[] to TEXT (encrypted JSON array).
-- Existing arrays are serialized to JSON strings first.
ALTER TABLE "Claim" ALTER COLUMN "diagnosisCodes" TYPE TEXT USING array_to_json("diagnosisCodes")::TEXT;
