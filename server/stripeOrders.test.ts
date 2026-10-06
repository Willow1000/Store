import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * In-memory stand-in for the handful of PostgREST calls stripeOrders.ts makes,
 * so the order-recording rules can be tested without touching the live
 * database or Stripe.
 */
type Row = Record<string, any>;
const tables: Record<string, Row[]> = {};
const failInsertInto = new Set<string>();
let nextId = 1;

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let action: "select" | "insert" | "update" | "delete" = "select";
  let payload: any = null;

  const rows = () => (tables[table] ||= []);
  const matching = () =>
    rows().filter(row => filters.every(([col, value]) => row[col] === value));

  const run = () => {
    if (action === "insert") {
      if (failInsertInto.has(table)) {
        return { data: null, error: { message: `${table} insert rejected` } };
      }
      const inserted = (Array.isArray(payload) ? payload : [payload]).map(
        (row: Row) => ({
          id: `${table}-${nextId++}`,
          created_at: String(nextId).padStart(6, "0"),
          ...row,
        })
      );
      rows().push(...inserted);
      return { data: inserted, error: null };
    }
    if (action === "update") {
      const hit = matching();
      hit.forEach(row => Object.assign(row, payload));
      return { data: hit, error: null };
    }
    if (action === "delete") {
      const hit = matching();
      tables[table] = rows().filter(row => !hit.includes(row));
      return { data: hit, error: null };
    }
    return { data: matching(), error: null };
  };

  const builder: any = {
    select: () => builder,
    order: () => builder,
    eq: (col: string, value: unknown) => {
      filters.push([col, value]);
      return builder;
    },
    insert: (value: any) => {
      action = "insert";
      payload = value;
      return builder;
    },
    update: (value: any) => {
      action = "update";
      payload = value;
      return builder;
    },
    delete: () => {
      action = "delete";
      return builder;
    },
    single: async () => {
      const result = run();
      return { data: result.data?.[0] ?? null, error: result.error };
    },
    maybeSingle: async () => {
      const result = run();
      return { data: result.data?.[0] ?? null, error: result.error };
    },
    then: (resolve: any, reject: any) =>
      Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => query(table) }),
}));
vi.mock("./_core/env", () => ({
  ENV: { supabaseUrl: "https://example.supabase.co", supabaseServiceKey: "k" },
}));
const sendOrderConfirmationEmail = vi.fn(async () => undefined);
vi.mock("./_core/emailService", () => ({ sendOrderConfirmationEmail }));
const listLineItems = vi.fn();
vi.mock("./stripe", () => ({
  stripe: { checkout: { sessions: { listLineItems } } },
}));

const USER = "11111111-1111-4111-8111-111111111111";
// Starts with a letter: parseInt() of this is NaN, which is what used to make
// the checkout reject the whole cart.
const PRODUCT_A = "f0e1d2c3-aaaa-4bbb-8ccc-000000000001";
const PRODUCT_B = "26717a32-f909-4823-80f8-cdfd92ca812f";

function source(overrides: Record<string, any> = {}) {
  return {
    paymentIntentId: "pi_1",
    metadata: {
      user_id: USER,
      subtotal: "140.00",
      shipping: "10",
      tax: "0",
      discountAmount: "5",
      usd_total: "145.00",
      offerCode: "save5",
      customer_name: "Sam Buyer",
    },
    chargeCurrency: "EUR",
    chargeAmount: 133.4,
    customerEmail: "sam@example.com",
    lines: [
      { productId: PRODUCT_A, quantity: 2, usdPrice: 45, title: "Floor mats" },
      { productId: PRODUCT_B, quantity: 1, usdPrice: 50, title: "Seat set" },
    ],
    origin: "https://shop.example",
    paidAt: new Date("2026-10-01T12:00:00Z"),
    ...overrides,
  };
}

describe("recordStripeOrder", () => {
  beforeEach(() => {
    for (const key of Object.keys(tables)) delete tables[key];
    failInsertInto.clear();
    sendOrderConfirmationEmail.mockClear();
    tables.profiles = [{ id: USER }];
    tables.cart_items = [{ id: "c1", user_id: USER }];
  });

  it("writes the order, its uuid-keyed items and the payment", async () => {
    const { recordStripeOrder } = await import("./stripeOrders");
    const result = await recordStripeOrder(source());

    expect(result.created).toBe(true);
    expect(tables.orders).toHaveLength(1);
    expect(tables.orders[0]).toMatchObject({
      id: result.orderId,
      user_id: USER,
      // USD, even though the customer was charged in euros.
      total_amount: 145,
      currency: "USD",
      status: "confirmed",
      discountAmount: 5,
      offerCode: "SAVE5",
    });
    expect(
      tables.order_items.map(i => [i.product_id, i.quantity, i.price])
    ).toEqual([
      [PRODUCT_A, 2, 45],
      [PRODUCT_B, 1, 50],
    ]);
    expect(tables.payments).toHaveLength(1);
    expect(tables.payments[0]).toMatchObject({
      order_id: result.orderId,
      reference: "pi_1",
      status: "succeeded",
      amount: 133.4,
      currency: "EUR",
      user_id: USER,
    });
    expect(tables.cart_items).toHaveLength(0);
    expect(sendOrderConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("records a payment only once when called again", async () => {
    const { recordStripeOrder } = await import("./stripeOrders");
    const first = await recordStripeOrder(source());
    const second = await recordStripeOrder(source());

    expect(second).toEqual({ orderId: first.orderId, created: false });
    expect(tables.orders).toHaveLength(1);
    expect(tables.order_items).toHaveLength(2);
    expect(tables.payments).toHaveLength(1);
    expect(sendOrderConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("records a guest order without a user", async () => {
    const { recordStripeOrder } = await import("./stripeOrders");
    const base = source();
    await recordStripeOrder({
      ...base,
      metadata: { ...base.metadata, user_id: "" },
    });

    expect(tables.orders[0].user_id).toBeNull();
    expect(tables.payments[0].user_id).toBeNull();
    // Nobody's cart is cleared for a guest.
    expect(tables.cart_items).toHaveLength(1);
  });

  it("leaves nothing behind when the order cannot be written, so a retry works", async () => {
    const { recordStripeOrder } = await import("./stripeOrders");
    failInsertInto.add("order_items");

    await expect(recordStripeOrder(source())).rejects.toThrow(
      /Order items insert failed/
    );
    expect(tables.orders).toHaveLength(0);
    expect(tables.payments).toHaveLength(0);

    failInsertInto.clear();
    const retry = await recordStripeOrder(source());
    expect(retry.created).toBe(true);
    expect(tables.orders).toHaveLength(1);
  });

  it("refuses a non-USD charge that has no USD total to record", async () => {
    const { recordStripeOrder } = await import("./stripeOrders");
    const base = source();
    const { usd_total: _usdTotal, ...metadata } = base.metadata;

    await expect(recordStripeOrder({ ...base, metadata })).rejects.toThrow(
      /no usd_total/
    );
    expect(tables.orders || []).toHaveLength(0);
  });
});

describe("loadStripeOrderSource", () => {
  const session = (overrides: Record<string, any> = {}): any => ({
    id: "cs_1",
    payment_status: "paid",
    payment_intent: "pi_1",
    currency: "eur",
    amount_total: 13340,
    created: 1790856000,
    success_url: "https://shop.example/checkout?payment=success",
    customer_details: { email: "sam@example.com" },
    metadata: { user_id: USER, charge_total: "133.40", usd_total: "145.00" },
    ...overrides,
  });

  beforeEach(() => {
    listLineItems.mockReset();
    listLineItems.mockResolvedValue({
      data: [
        {
          quantity: 2,
          price: {
            product: {
              name: "Floor mats",
              metadata: { productId: PRODUCT_A, usdPrice: "45.00" },
            },
          },
        },
        // Shipping is a line item without a product id and must be skipped.
        { quantity: 1, price: { product: { name: "Shipping", metadata: {} } } },
      ],
    });
  });

  it("builds order lines from the session's product line items only", async () => {
    const { loadStripeOrderSource } = await import("./stripeOrders");
    const result = await loadStripeOrderSource(session());

    expect(result?.lines).toEqual([
      { productId: PRODUCT_A, quantity: 2, usdPrice: 45, title: "Floor mats" },
    ]);
    expect(result).toMatchObject({
      paymentIntentId: "pi_1",
      chargeCurrency: "EUR",
      chargeAmount: 133.4,
      customerEmail: "sam@example.com",
      origin: "https://shop.example",
    });
  });

  it("ignores a session that has not been paid", async () => {
    const { loadStripeOrderSource } = await import("./stripeOrders");
    expect(
      await loadStripeOrderSource(session({ payment_status: "unpaid" }))
    ).toBeNull();
    expect(listLineItems).not.toHaveBeenCalled();
  });
});
