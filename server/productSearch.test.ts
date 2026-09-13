import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const describeIfConfigured = ENV.supabaseUrl ? describe : describe.skip;

function anonymousContext(): TrpcContext {
  return { user: null } as TrpcContext;
}

describeIfConfigured("products.list", () => {
  it("returns real catalog rows, not an empty list", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const products = await caller.products.list({ limit: 25, offset: 0 });

    // Regression guard: this procedure used to call db.ts's getProducts(),
    // whose Drizzle schema targets column names the live `products` table does
    // not have. It therefore always resolved to an empty array, and because
    // Search.tsx is its only consumer, site search silently found nothing for
    // every query.
    expect(products.length).toBeGreaterThan(0);

    const [product] = products;
    expect(typeof product.id).toBe("string");
    expect(product).toHaveProperty("title");
    expect(product).toHaveProperty("price");
  });

  it("honours limit and offset", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const firstTwo = await caller.products.list({ limit: 2, offset: 0 });
    const second = await caller.products.list({ limit: 1, offset: 1 });

    expect(firstTwo).toHaveLength(2);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(firstTwo[1].id);
  });
});

describeIfConfigured("products.search", () => {
  it("searches the whole catalogue, not just the first page of products", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const result = await caller.products.search({
      query: "brake",
      limit: 48,
      offset: 0,
    });

    // Regression guard: search used to fetch the first 100 products and filter
    // them in the browser, so anything outside that window was invisible.
    // "brake" matched nothing under that approach despite the catalogue
    // containing brake parts.
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("neutralises ilike wildcards instead of matching everything", async () => {
    const caller = appRouter.createCaller(anonymousContext());

    for (const query of ["%", "_", "*"]) {
      const result = await caller.products.search({
        query,
        limit: 10,
        offset: 0,
      });
      expect(result.total).toBe(0);
    }
  });

  it("does not break on PostgREST filter syntax in the query", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const result = await caller.products.search({
      query: "opel,zafira",
      limit: 10,
      offset: 0,
    });
    expect(result.total).toBeGreaterThan(0);
  });

  it("returns nothing for an empty query", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const result = await caller.products.search({
      query: "   ",
      limit: 10,
      offset: 0,
    });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("pages through matches without losing the total", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const firstPage = await caller.products.search({
      query: "opel",
      limit: 2,
      offset: 0,
    });
    const secondPage = await caller.products.search({
      query: "opel",
      limit: 2,
      offset: 2,
    });

    expect(firstPage.total).toBe(secondPage.total);
    expect(firstPage.items).toHaveLength(2);
    const firstIds = firstPage.items.map(p => p.id);
    secondPage.items.forEach(p => expect(firstIds).not.toContain(p.id));
  });
});
