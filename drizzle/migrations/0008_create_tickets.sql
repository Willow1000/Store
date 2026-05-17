-- Migration: create tickets/support table
-- Stores user-submitted tickets, complaints and support requests

DROP TABLE IF EXISTS public.tickets CASCADE;

-- Ensure enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved','closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('low','medium','high');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  referenceCode varchar(64) NOT NULL UNIQUE,
  userId integer NULL,
  contactEmail varchar(320) NULL,
  contactPhone varchar(32) NULL,
  title varchar(255) NOT NULL,
  description text NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  channel varchar(50) NOT NULL DEFAULT 'web',
  assignedTo integer NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamp with time zone NOT NULL DEFAULT now(),
  updatedAt timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets USING btree (userId);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_reference_code ON public.tickets USING btree (referenceCode);
