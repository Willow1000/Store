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

  it("only states a lastmod where a real date exists", async () => {
    const xml = await generateSitemap("https://www.motorvault.shop", "site");
    const today = new Date().toISOString().split("T")[0];
    const entry = (path: string) =>
      xml
        .split("<url>")
        .find(chunk =>
          chunk.includes(`<loc>https://www.motorvault.shop${path}</loc>`)
        ) ?? "";

    expect(entry("/privacy")).not.toBe("");
    expect(entry("/privacy")).not.toContain("<lastmod>");
    expect(entry("/vehicle/ford-f150")).not.toContain("<lastmod>");
    expect(entry("/nl/auto-motorblokken")).not.toBe("");
    expect(xml).toMatch(/\/blog\/[^<]+<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}</);
    expect(xml).not.toContain(`<lastmod>${today}</lastmod>`);
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
});
