-- Add updated_at column to orders table to track status changes
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

-- Create index for efficient queries on status and updated_at
CREATE INDEX IF NOT EXISTS "idx_orders_status_updated_at" ON "orders"("status", "updated_at");
