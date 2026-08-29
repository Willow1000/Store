import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

export type SupabaseProduct = {
  id: string;
  title: string | null;
  category_name: string | null;
  price: number | string | null;
  condition: string | null;
  cover_image_url: string | null;
  brand: string | null;
  model: string | null;
  item_specifics: string | null;
  discount: number | string | null;
  stock: number | null;
  part_number: string | null;
  created_at?: string | null;
};

/**
 * Fetches products directly from the live Supabase `products` table via
 * its REST API. server/db.ts's Drizzle-based product queries target a
 * different schema shape (integer ids, a `name` column, categoryId/sellerId
 * foreign keys) that doesn't match this table's real columns (uuid ids,
 * `title`, `category_name`, `part_number`, etc.) - confirmed directly
 * against production - so anything matching real catalog data needs to go
 * through here instead of db.ts's getProducts()/getTrendingProducts().
 */
export async function getAllSupabaseProducts(
  limit = 2000
): Promise<SupabaseProduct[]> {
  if (!ENV.supabaseUrl) {
    logger.warn("[SupabaseProducts] Supabase URL is not configured");
    return [];
  }

  const supabase = createClient(
    ENV.supabaseUrl,
    ENV.supabaseServiceKey || ENV.supabaseAnonKey || ""
  );

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, title, category_name, price, condition, cover_image_url, brand, model, item_specifics, discount, stock, part_number, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn(
      { data: [error.message] },
      "[SupabaseProducts] Product lookup failed:"
    );
    return [];
  }

  return Array.isArray(data) ? (data as SupabaseProduct[]) : [];
}
