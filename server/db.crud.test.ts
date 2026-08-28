import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  createOrder,
  createPayment,
  clearUserCart,
  addToCart,
  getUserCart,
} from "./db";
import { orders, payments } from "../drizzle/schema";

// These exercise real database round-trips against whatever DATABASE_URL
// points to (docker-compose's local Postgres in dev, the CI Postgres
// service in CI - see .github/workflows/ci.yml). Skipped entirely when no
// database is configured, e.g. a contributor running `vitest run` without
// `docker-compose up postgres -d` first.
const hasDb = isDatabaseConfigured();
const describeIfDb = hasDb ? describe : describe.skip;

// Well outside the range any real seeded data would use, and unique per
// test file run, so repeated runs never collide with leftover rows from a
// previous run that failed to clean up.
const TEST_USER_ID = 900_000_000 + Math.floor(Math.random() * 1_000_000);
const TEST_PRODUCT_ID = 900_000_000 + Math.floor(Math.random() * 1_000_000);

describeIfDb("db.ts CRUD against a real database", () => {
  const createdOrderIds: number[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    for (const orderId of createdOrderIds.splice(0)) {
      await db.delete(payments).where(eq(payments.orderId, orderId));
      await db.delete(orders).where(eq(orders.id, orderId));
    }
    await clearUserCart(TEST_USER_ID);
  });

  it("createOrder inserts a row and returns its id", async () => {
    const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await createOrder(TEST_USER_ID, {
      orderNumber,
      subtotal: "100.00",
      total: "112.50",
      shippingCost: "12.50",
      status: "pending",
    });

    expect(result?.id).toBeTypeOf("number");
    if (result?.id) createdOrderIds.push(result.id);

    const db = await getDb();
    const [row] = (await db
      ?.select()
      .from(orders)
      .where(eq(orders.id, result!.id))) ?? [null];
    expect(row?.orderNumber).toBe(orderNumber);
    expect(row?.userId).toBe(TEST_USER_ID);
  });

  it("createPayment inserts a row linked to its order", async () => {
    const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const order = await createOrder(TEST_USER_ID, {
      orderNumber,
      subtotal: "50.00",
      total: "50.00",
      status: "pending",
    });
    expect(order?.id).toBeTypeOf("number");
    createdOrderIds.push(order!.id);

    const reference = `test-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createPayment(order!.id, TEST_USER_ID, {
      provider: "stripe",
      reference,
      amount: "50.00",
      currency: "USD",
      status: "success",
    });

    const db = await getDb();
    const [row] = (await db
      ?.select()
      .from(payments)
      .where(eq(payments.reference, reference))) ?? [null];
    expect(row?.orderId).toBe(order!.id);
    expect(row?.userId).toBe(TEST_USER_ID);
    expect(row?.status).toBe("success");
  });

  it("clearUserCart removes all of a user's cart items", async () => {
    await addToCart(TEST_USER_ID, TEST_PRODUCT_ID, undefined, 2);
    const before = await getUserCart(TEST_USER_ID);
    expect(before.length).toBeGreaterThan(0);

    await clearUserCart(TEST_USER_ID);

    const after = await getUserCart(TEST_USER_ID);
    expect(after).toHaveLength(0);
  });
});
