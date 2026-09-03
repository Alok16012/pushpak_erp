-- Add portal and payment feature columns to branches table
ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "onlineFeePayment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "studentPortal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "parentPortal" BOOLEAN NOT NULL DEFAULT false;
