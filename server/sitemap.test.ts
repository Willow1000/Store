import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { generateSitemap } from "./sitemap";

const describeIfConfigured = ENV.supabaseUrl ? describe : describe.skip;

describeIfConfigured("generateSitemap", () => {
  it("lists real product urls in the product sitemap", async () => {
    const xml = await generateSitemap(
      "https://www.motorvault.shop",
      "products"
    );
    const productLocs =
      xml.match(/<loc>[^<]*\/product\/[^<]*<\/loc>/g)?.length ?? 0;

    // Regression guard: this sitemap used to be generated from db.ts's Drizzle
    // `products` schema, whose column names do not match the live Supabase
    // table, so it always came back empty and shipped containing only
    // /products itself - leaving every product page undiscoverable by sitemap.
    expect(productLocs).toBeGreaterThan(0);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });

  it("keeps the site sitemap separate from product urls", async () => {
    const xml = await generateSitemap("https://www.motorvault.shop", "site");
    expect(xml).toContain("https://www.motorvault.shop/");
    expect(xml).not.toMatch(/<loc>[^<]*\/product\/[^<]*<\/loc>/);
  });
});
