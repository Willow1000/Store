-- Migration: recommendation profiles, events, and cached scores
-- Supports session/user personalization, analytics, and precomputed scores.

ALTER TABLE public.product_search_tracking
  DROP CONSTRAINT IF EXISTS product_search_tracking_event_type_check;

CREATE TABLE IF NOT EXISTS public.user_product_interactions (
  id uuid not null default gen_random_uuid(),
  sessionId text not null,
  userId uuid null,
  productId text not null,
  eventType text not null,
  searchTerm text null,
  category text null,
  brand text null,
  model text null,
  weight numeric(10, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  createdAt timestamp with time zone not null default now(),
  constraint user_product_interactions_pkey primary key (id)
);

CREATE INDEX IF NOT EXISTS idx_user_product_interactions_session_id
  ON public.user_product_interactions USING btree (sessionId);

CREATE INDEX IF NOT EXISTS idx_user_product_interactions_user_id
  ON public.user_product_interactions USING btree (userId);

CREATE INDEX IF NOT EXISTS idx_user_product_interactions_product_id
  ON public.user_product_interactions USING btree (productId);

CREATE INDEX IF NOT EXISTS idx_user_product_interactions_event_type
  ON public.user_product_interactions USING btree (eventType);

CREATE INDEX IF NOT EXISTS idx_user_product_interactions_created_at
  ON public.user_product_interactions USING btree (createdAt DESC);

CREATE TABLE IF NOT EXISTS public.user_brand_preferences (
  id uuid not null default gen_random_uuid(),
  sessionId text null,
  userId uuid null,
  brand text not null,
  weight numeric(10, 2) not null default 0,
  interactionCount integer not null default 0,
  updatedAt timestamp with time zone not null default now(),
  constraint user_brand_preferences_pkey primary key (id)
);

CREATE INDEX IF NOT EXISTS idx_user_brand_preferences_user_id
  ON public.user_brand_preferences USING btree (userId);

CREATE INDEX IF NOT EXISTS idx_user_brand_preferences_session_id
  ON public.user_brand_preferences USING btree (sessionId);

CREATE INDEX IF NOT EXISTS idx_user_brand_preferences_brand
  ON public.user_brand_preferences USING btree (brand);

CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id uuid not null default gen_random_uuid(),
  sessionId text null,
  userId uuid null,
  category text not null,
  weight numeric(10, 2) not null default 0,
  interactionCount integer not null default 0,
  updatedAt timestamp with time zone not null default now(),
  constraint user_category_preferences_pkey primary key (id)
);

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id
  ON public.user_category_preferences USING btree (userId);

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_session_id
  ON public.user_category_preferences USING btree (sessionId);

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_category
  ON public.user_category_preferences USING btree (category);

CREATE TABLE IF NOT EXISTS public.user_vehicle_preferences (
  id uuid not null default gen_random_uuid(),
  sessionId text null,
  userId uuid null,
  vehicleBrand text null,
  vehicleModel text null,
  generation text null,
  category text null,
  confidence integer not null default 0,
  weight numeric(10, 2) not null default 0,
  updatedAt timestamp with time zone not null default now(),
  constraint user_vehicle_preferences_pkey primary key (id)
);

CREATE INDEX IF NOT EXISTS idx_user_vehicle_preferences_user_id
  ON public.user_vehicle_preferences USING btree (userId);

CREATE INDEX IF NOT EXISTS idx_user_vehicle_preferences_session_id
  ON public.user_vehicle_preferences USING btree (sessionId);

CREATE INDEX IF NOT EXISTS idx_user_vehicle_preferences_vehicle
  ON public.user_vehicle_preferences USING btree (vehicleBrand, vehicleModel);

CREATE TABLE IF NOT EXISTS public.recommendation_scores (
  id uuid not null default gen_random_uuid(),
  sessionId text null,
  userId uuid null,
  productId text not null,
  score numeric(12, 4) not null default 0,
  scoreBreakdown jsonb not null default '{}'::jsonb,
  reason text null,
  source text not null default 'profile',
  expiresAt timestamp with time zone null,
  createdAt timestamp with time zone not null default now(),
  updatedAt timestamp with time zone not null default now(),
  constraint recommendation_scores_pkey primary key (id)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_scores_user_id
  ON public.recommendation_scores USING btree (userId);

CREATE INDEX IF NOT EXISTS idx_recommendation_scores_session_id
  ON public.recommendation_scores USING btree (sessionId);

CREATE INDEX IF NOT EXISTS idx_recommendation_scores_product_id
  ON public.recommendation_scores USING btree (productId);

CREATE INDEX IF NOT EXISTS idx_recommendation_scores_score
  ON public.recommendation_scores USING btree (score DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_scores_expires_at
  ON public.recommendation_scores USING btree (expiresAt);
