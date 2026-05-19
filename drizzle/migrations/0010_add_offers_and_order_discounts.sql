CREATE TABLE IF NOT EXISTS "offers" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "code" varchar(64) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "type" varchar(16) NOT NULL,
  "value" numeric(10, 2) NOT NULL,
  "minimumSubtotal" numeric(10, 2),
  "maxUses" integer,
  "usedCount" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "startsAt" timestamp with time zone,
  "endsAt" timestamp with time zone,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "offerId" integer,
  ADD COLUMN IF NOT EXISTS "offerCode" varchar(64),
  ADD COLUMN IF NOT EXISTS "discountAmount" numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_offerId_offers_id_fk"
  FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL;
