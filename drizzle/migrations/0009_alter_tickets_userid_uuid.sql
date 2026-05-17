-- Migration: alter tickets table to support UUID userId and assignedTo
-- Changes userid and assignedto columns from integer to varchar(36) for Supabase auth UUIDs

BEGIN;

-- Change userid column from integer to varchar(36)
ALTER TABLE public.tickets ALTER COLUMN userid DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN userid TYPE varchar(36) USING NULL;

-- Change assignedto column from integer to varchar(36)
ALTER TABLE public.tickets ALTER COLUMN assignedto DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN assignedto TYPE varchar(36) USING NULL;

COMMIT;
