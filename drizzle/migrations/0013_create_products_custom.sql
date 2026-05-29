-- Create products table matching user's requested schema
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category_name text NOT NULL,
  owner_id uuid NULL,
  price numeric(10,2) NOT NULL,
  condition text NOT NULL,
  cover_image_url text NOT NULL,
  brand text NULL,
  model text NULL,
  item_specifics text NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  discount real NULL,
  stock smallint NOT NULL DEFAULT '0'::smallint,
  part_number text NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_products_category_name ON public.products USING btree (category_name);
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products USING btree (price);
