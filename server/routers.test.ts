import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getDb, isDatabaseConfigured, clearUserCart } from "./db";
import { orders, payments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const hasDb = isDatabaseConfigured();
const describeIfDb = hasDb ? describe : describe.skip;

const TEST_USER_ID = 900_000_000 + Math.floor(Math.random() * 1_000_000);
const TEST_PRODUCT_ID = 900_000_000 + Math.floor(Math.random() * 1_000_000);

function createContext(): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: TEST_USER_ID,
    openId: `test-open-id-${TEST_USER_ID}`,
    // Deliberately empty, not a real address - createOrder only sends a
    // confirmation email when this is truthy, and this test suite must
    // never trigger a real outbound email.
    email: "",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      header: () => undefined,
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describeIfDb("appRouter (against a real database)", () => {
  const createdOrderIds: number[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (db) {
      for (const orderId of createdOrderIds.splice(0)) {
        await db.delete(payments).where(eq(payments.orderId, orderId));
        await db.delete(orders).where(eq(orders.id, orderId));
      }
    }
    await clearUserCart(TEST_USER_ID);
  });

  it("cart.addItem then cart.getCart reflects the added item", async () => {
    const caller = appRouter.createCaller(createContext());

    await caller.cart.addItem({ productId: TEST_PRODUCT_ID, quantity: 3 });
    const cart = await caller.cart.getCart();

    const item = cart.find(row => row.productId === TEST_PRODUCT_ID);
    expect(item).toBeDefined();
    expect(item?.quantity).toBe(3);
  });

  it("offers.resolve returns null for a code that doesn't exist", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.offers.resolve({
      code: `nonexistent-offer-${Date.now()}`,
      subtotal: 100,
    });

    expect(result).toBeNull();
  });

  it("orders.create then orders.list surfaces the new order", async () => {
    const caller = appRouter.createCaller(createContext());
    const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const created = await caller.orders.create({
      orderNumber,
      subtotal: "75.00",
      total: "75.00",
      shippingAddress: { line1: "123 Test St" },
      paymentMethod: "stripe",
    });
    expect(created?.id).toBeTypeOf("number");
    if (created?.id) createdOrderIds.push(created.id);

    const list = await caller.orders.list();
    expect(list.some(order => order.orderNumber === orderNumber)).toBe(true);
  });
});
