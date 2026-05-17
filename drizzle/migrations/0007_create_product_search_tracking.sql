-- Migration: create product search tracking table
-- Logs detailed search/filter tracking and product clicks with all parameters
-- 
-- Captured Data:
-- - Session context: sessionId, userId, createdAt, userAgent, pageUrl, referrer
-- - Search parameters: searchTerm, all filters (category, brands, models, conditions, priceRange, inStockOnly, dealsOnly)
-- - Results: resultsCount (total matching products), matchedProductIds (first 50 matched products)
-- - User action: eventType (search or product_click), clickedProductId (if applicable)
-- - Analytics: metadata (any additional context)

CREATE TABLE IF NOT EXISTS public.product_search_tracking (
  id uuid not null default gen_random_uuid(),
  sessionId text not null,
  userId uuid null,
  eventType text not null,
  searchTerm text null,
  filters jsonb not null default '{}'::jsonb,
  resultsCount integer not null default 0,
  matchedProductIds jsonb not null default '[]'::jsonb,
  clickedProductId uuid null,
  pageUrl text null,
  referrer text null,
  userAgent text null,
  metadata jsonb not null default '{}'::jsonb,
  createdAt timestamp with time zone not null default now(),
  constraint product_search_tracking_pkey primary key (id),
  constraint product_search_tracking_event_type_check check (
    eventType in (
      'search',
      'product_click'
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_session_id
  ON public.product_search_tracking USING btree (sessionId) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_user_id
  ON public.product_search_tracking USING btree (userId) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_event_type
  ON public.product_search_tracking USING btree (eventType) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_search_term
  ON public.product_search_tracking USING btree (searchTerm) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_clicked_product_id
  ON public.product_search_tracking USING btree (clickedProductId) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_product_search_tracking_created_at
  ON public.product_search_tracking USING btree (createdAt DESC) TABLESPACE pg_default;