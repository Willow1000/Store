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

const SEARCHABLE_COLUMNS = [
  "title",
  "item_specifics",
  "brand",
  "model",
  "part_number",
  "category_name",
] as const;

/**
 * PostgREST's `or=` filter is a comma-separated list wrapped in parentheses, so
 * a comma or bracket in user input would be parsed as filter syntax rather than
 * as text. `%` and `_` are ilike wildcards and would silently widen the match.
 * Strip all of them; what remains still covers part numbers and fitment
 * strings, which is what people actually paste in.
 */
function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()%_*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Full-catalog product search.
 *
 * The filter runs in Postgres rather than in node, so this stays correct as the
 * catalog grows instead of depending on how many rows a caller happened to
 * fetch first. Matching rows are then ranked here - a hit in the title or part
 * number is a stronger signal than one buried in the spec blob - and paged.
 */
export async function searchSupabaseProducts(
  query: string,
  limit = 20,
  offset = 0
): Promise<{ items: SupabaseProduct[]; total: number }> {
  const term = sanitizeSearchTerm(query);
  if (!ENV.supabaseUrl || !term) return { items: [], total: 0 };

  const supabase = createClient(
    ENV.supabaseUrl,
    ENV.supabaseServiceKey || ENV.supabaseAnonKey || ""
  );

  const orFilter = SEARCHABLE_COLUMNS.map(
    column => `${column}.ilike.%${term}%`
  ).join(",");

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, title, category_name, price, condition, cover_image_url, brand, model, item_specifics, discount, stock, part_number, created_at"
    )
    .or(orFilter)
    .limit(1000);

  if (error) {
    logger.warn(
      { data: [error.message] },
      "[SupabaseProducts] Product search failed:"
    );
    return { items: [], total: 0 };
  }

  const matches = Array.isArray(data) ? (data as SupabaseProduct[]) : [];
  const needle = term.toLowerCase();

  const score = (product: SupabaseProduct): number => {
    const title = (product.title || "").toLowerCase();
    const partNumber = (product.part_number || "").toLowerCase();
    if (partNumber && partNumber === needle) return 0;
    if (title.startsWith(needle)) return 1;
    if (title.includes(needle)) return 2;
    if (partNumber.includes(needle)) return 3;
    if ((product.brand || "").toLowerCase().includes(needle)) return 4;
    if ((product.model || "").toLowerCase().includes(needle)) return 5;
    return 6;
  };

  const ranked = matches
    .map((product, index) => ({ product, index, rank: score(product) }))
    // `index` keeps the tie-break stable on the created_at order the table
    // returns, so equal-scoring results do not reshuffle between requests.
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.product);

  return {
    items: ranked.slice(offset, offset + limit),
    total: ranked.length,
  };
}
