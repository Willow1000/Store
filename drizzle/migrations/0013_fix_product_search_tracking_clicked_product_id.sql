-- Migration: store product search tracking clicked product IDs as text
-- This allows integer product IDs to be recorded without UUID validation failures.

ALTER TABLE public.product_search_tracking
  ALTER COLUMN clickedproductid TYPE text
  USING clickedproductid::text;
