-- Add soft-delete support to Claim model
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add unique constraint to ProviderCredential if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProviderCredential_providerId_payerId_key'
  ) THEN
    ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_providerId_payerId_key" UNIQUE ("providerId", "payerId");
  END IF;
END $$;
