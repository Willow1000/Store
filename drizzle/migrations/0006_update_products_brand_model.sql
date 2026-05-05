-- Migration: Update products table with Brand and Model relationships
-- This migration adds new columns to products table and adds foreign key constraints

-- Add new columns to products table if they don't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text null;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model text null;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_specifics jsonb null;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS part_number text null;

-- Add foreign key constraints to Brand and Model tables
ALTER TABLE public.products 
ADD CONSTRAINT products_brand_fkey 
FOREIGN KEY (brand) REFERENCES public."Brand" (name) 
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.products 
ADD CONSTRAINT products_model_fkey 
FOREIGN KEY (model) REFERENCES public.model (name) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products USING btree (brand) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products USING btree (model) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_products_part_number ON public.products USING btree (part_number) TABLESPACE pg_default;
