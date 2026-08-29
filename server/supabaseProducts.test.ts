import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { getAllSupabaseProducts } from "./supabaseProducts";

const describeIfConfigured = ENV.supabaseUrl ? describe : describe.skip;

describeIfConfigured("getAllSupabaseProducts", () => {
  it("returns real products with the actual production column shape", async () => {
    const products = await getAllSupabaseProducts(5);

    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const [product] = products;
    // These are the columns the live `products` table actually has -
    // server/db.ts's Drizzle schema uses different names (`name`,
    // integer ids, categoryId) that don't match this table at all, which
    // is why filterProducts previously always returned empty/fallback
    // results in production. This assertion is the regression guard for
    // that mismatch.
    expect(typeof product.id).toBe("string");
    expect(product).toHaveProperty("title");
    expect(product).toHaveProperty("category_name");
    expect(product).toHaveProperty("cover_image_url");
    expect(product).toHaveProperty("part_number");
  });
});
