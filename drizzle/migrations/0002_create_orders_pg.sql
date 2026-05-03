-- Migration: create orders and order_items tables for Postgres
-- Run this on your Postgres database to add orders and order_items

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  total_amount numeric(10, 2) not null,
  currency text null default 'USD'::text,
  status text null default 'pending'::text,
  created_at timestamp without time zone null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_user_id_fkey foreign KEY (user_id) references profiles (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_orders_user_id on public.orders using btree (user_id) TABLESPACE pg_default;

create table IF NOT EXISTS public.order_items (
  id uuid not null default gen_random_uuid (),
  order_id uuid null,
  product_id uuid null,
  quantity integer null default 1,
  price numeric(10, 2) not null,
  created_at timestamp without time zone null default now(),
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (id)
) TABLESPACE pg_default;

create index IF not exists idx_order_items_order_id on public.order_items using btree (order_id) TABLESPACE pg_default;
