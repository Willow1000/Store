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
