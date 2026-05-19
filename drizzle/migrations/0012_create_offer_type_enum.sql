-- Create the offer_type enum
CREATE TYPE "offer_type" AS ENUM ('percentage', 'fixed');

-- Migrate existing type column from varchar to enum
ALTER TABLE "offers"
  ALTER COLUMN "type" TYPE "offer_type" USING "type"::"offer_type";
