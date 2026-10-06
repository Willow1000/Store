import type Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";
import { stripe } from "./stripe";
import { recordOfferRedemption } from "./offers";

/**
 * Records a paid Stripe Checkout Session as an order in the live Supabase
 * tables (`orders`, `order_items`, `payments`).
 *
 * server/db.ts's createOrder()/createPayment() target the Drizzle schema
 * (integer ids, orderNumber/subtotal/shippingCost columns), which is not the
 * shape of the real tables - those use uuid ids and a much smaller `orders`
 * row. A Stripe payment therefore has to be written through here to show up
 * on the customer's Orders page.
 *
 * It is called from two places that can race: the Stripe webhook, and the
 * browser returning from Checkout. The `payments` row for the PaymentIntent is
 * the claim that makes the second caller a no-op.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type StripeOrderLine = {
  productId: string;
  quantity: number;
  /** Unit price in USD, as charged against the catalogue. */
  usdPrice: number;
  title: string;
};

export type StripeOrderSource = {
  paymentIntentId: string;
  metadata: Record<string, string>;
  /** ISO code of the currency the customer was actually charged in. */
  chargeCurrency: string;
  /** Amount actually charged, in major units of `chargeCurrency`. */
  chargeAmount: number;
  customerEmail: string;
  lines: StripeOrderLine[];
  origin: string;
  paidAt: Date;
};

export type RecordedStripeOrder = {
  orderId: string | null;
  /** False when another caller had already recorded this payment. */
  created: boolean;
};

function getServiceClient(): SupabaseClient | null {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceKey) return null;
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function originOf(url: string | null | undefined): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

/**
 * Turns a paid Checkout Session into the facts an order is built from. The
 * product lines come from the session's own line items rather than from
 * metadata: Stripe caps a metadata value at 500 characters, which a cart of
 * uuid-keyed items overflows after a handful of products.
 */
export async function loadStripeOrderSource(
  session: Stripe.Checkout.Session,
  options: { paymentConfirmed?: boolean } = {}
): Promise<StripeOrderSource | null> {
  // A `payment_intent.succeeded` webhook can arrive a moment before the session
  // itself reports "paid"; the caller vouches for the payment in that case.
  if (session.payment_status !== "paid" && !options.paymentConfirmed) {
    return null;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) return null;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const lines: StripeOrderLine[] = [];
  for (const item of lineItems.data) {
    const product = item.price?.product;
    if (!product || typeof product === "string" || product.deleted) continue;
    const productId = product.metadata?.productId;
    // Shipping and tax are line items too; only catalogue products carry an id.
    if (!isUuid(productId)) continue;
    lines.push({
      productId,
      quantity: Math.max(1, Math.trunc(toNumber(item.quantity, 1))),
      usdPrice: round2(toNumber(product.metadata?.usdPrice)),
      title: product.name,
    });
  }

  const metadata = (session.metadata || {}) as Record<string, string>;
  const chargeCurrency = String(session.currency || "usd").toUpperCase();
  const metadataChargeTotal = toNumber(metadata.charge_total, NaN);

  return {
    paymentIntentId,
    metadata,
    chargeCurrency,
    chargeAmount: Number.isFinite(metadataChargeTotal)
      ? metadataChargeTotal
      : toNumber(session.amount_total) / 100,
    customerEmail: String(
      metadata.email ||
        session.customer_details?.email ||
        session.customer_email ||
        ""
    ),
    lines,
    origin: originOf(session.success_url),
    paidAt: new Date((session.created || Date.now() / 1000) * 1000),
  };
}

async function sendConfirmationEmail(
  source: StripeOrderSource,
  orderId: string,
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  }
) {
  if (!source.customerEmail) return;

  try {
    const { sendOrderConfirmationEmail } = await import("./_core/emailService");
    const orderNumber = `STR-${orderId.slice(0, 8).toUpperCase()}`;
    await sendOrderConfirmationEmail(source.customerEmail, {
      customer_name: source.metadata.customer_name || "Valued Customer",
      order_number: orderNumber,
      order_date: source.paidAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      order_total: totals.total.toFixed(2),
      currency: "USD",
      subtotal: totals.subtotal.toFixed(2),
      shipping_cost: totals.shipping.toFixed(2),
      tax: totals.tax.toFixed(2),
      discount_amount: totals.discount.toFixed(2),
      order_url: `${source.origin || "https://motorvault.shop"}/orders/${orderId}`,
      support_email:
        process.env.SMTP_FROM_EMAIL ||
        process.env.GMAIL_USER ||
        "support@motorvault.shop",
      items: source.lines.map(line => ({
        name: line.title,
        sku: "",
        description: "",
        quantity: line.quantity,
        price: line.usdPrice.toFixed(2),
        unit_price: line.usdPrice.toFixed(2),
        line_total: (line.usdPrice * line.quantity).toFixed(2),
      })),
      receipt_filename: `motorvault-receipt-${orderNumber}.html`,
      language: source.metadata.language,
    } as any);
  } catch (error) {
    // The order is recorded; a failed email must not undo it.
    logger.error(
      { data: [error] },
      "[Stripe Orders] Confirmation email failed:"
    );
  }
}

export async function recordStripeOrder(
  source: StripeOrderSource
): Promise<RecordedStripeOrder> {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error("Supabase service credentials are not configured");
  }

  const findPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("id, order_id")
      .eq("provider", "stripe")
      .eq("reference", source.paymentIntentId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(`Payment lookup failed: ${error.message}`);
    return data || [];
  };

  const existing = await findPayments();
  if (existing.length > 0) {
    return { orderId: existing[0].order_id ?? null, created: false };
  }

  // Only attach the order to an account that really exists: orders.user_id is
  // a foreign key to profiles, and a guest checkout has no profile.
  let userId: string | null = null;
  if (isUuid(source.metadata.user_id)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", source.metadata.user_id)
      .maybeSingle();
    userId = profile?.id ?? null;
  }

  const metadataSubtotal = toNumber(source.metadata.subtotal, NaN);
  const linesSubtotal = source.lines.reduce(
    (sum, line) => sum + line.usdPrice * line.quantity,
    0
  );
  const totals = {
    subtotal: round2(
      Number.isFinite(metadataSubtotal) ? metadataSubtotal : linesSubtotal
    ),
    shipping: round2(toNumber(source.metadata.shipping)),
    tax: round2(toNumber(source.metadata.tax)),
    discount: round2(toNumber(source.metadata.discountAmount)),
    // Orders are kept in USD whatever currency the customer was charged in.
    total: round2(
      toNumber(source.metadata.usd_total ?? source.metadata.total, NaN)
    ),
  };
  if (!Number.isFinite(totals.total) || totals.total <= 0) {
    if (source.chargeCurrency !== "USD") {
      throw new Error(
        `Non-USD charge ${source.paymentIntentId} has no usd_total metadata`
      );
    }
    totals.total = round2(source.chargeAmount);
  }

  // Claim the payment before creating the order, so that the webhook and the
  // browser return - which both call this - cannot each create one.
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      provider: "stripe",
      reference: source.paymentIntentId,
      status: "succeeded",
      amount: round2(source.chargeAmount),
      currency: source.chargeCurrency,
      user_id: userId,
      channel: "card",
      gateway_response: "Stripe Checkout - payment succeeded",
      metadata: source.metadata,
      fees: 0,
      paid_at: source.paidAt.toISOString(),
    })
    .select("id")
    .single();
  if (paymentError || !payment) {
    throw new Error(
      `Payment insert failed: ${paymentError?.message || "no row returned"}`
    );
  }

  const claims = await findPayments();
  if (claims.length > 0 && claims[0].id !== payment.id) {
    await supabase.from("payments").delete().eq("id", payment.id);
    return { orderId: claims[0].order_id ?? null, created: false };
  }

  const parsedOfferId = Number.parseInt(source.metadata.offerId || "", 10);
  const offerId = Number.isInteger(parsedOfferId) ? parsedOfferId : null;

  let orderId: string | null = null;
  try {
    const offerCode = String(source.metadata.offerCode || "").trim();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totals.total,
        currency: "USD",
        status: "confirmed",
        discountAmount: totals.discount,
        offerId: offerId,
        offerCode: offerCode ? offerCode.toUpperCase().slice(0, 64) : null,
      })
      .select("id")
      .single();
    if (orderError || !order) {
      throw new Error(
        `Order insert failed: ${orderError?.message || "no row returned"}`
      );
    }
    orderId = order.id as string;

    if (source.lines.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(
        source.lines.map(line => ({
          order_id: orderId,
          product_id: line.productId,
          quantity: line.quantity,
          price: line.usdPrice,
        }))
      );
      if (itemsError) {
        throw new Error(`Order items insert failed: ${itemsError.message}`);
      }
    } else {
      logger.warn(
        { data: [source.paymentIntentId] },
        "[Stripe Orders] Paid session has no catalogue line items:"
      );
    }

    const { error: linkError } = await supabase
      .from("payments")
      .update({ order_id: orderId })
      .eq("id", payment.id);
    if (linkError) {
      throw new Error(`Payment link failed: ${linkError.message}`);
    }
  } catch (error) {
    // Release the claim and drop the partial order so a retry - Stripe resends
    // a webhook that did not get a 2xx - can record the payment from scratch.
    if (orderId) {
      await supabase.from("order_items").delete().eq("order_id", orderId);
      await supabase.from("orders").delete().eq("id", orderId);
    }
    await supabase.from("payments").delete().eq("id", payment.id);
    throw error;
  }

  if (userId) {
    const { error: cartError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (cartError) {
      logger.warn(
        { data: [cartError.message] },
        "[Stripe Orders] Could not clear cart after payment:"
      );
    }
  }

  if (offerId !== null) await recordOfferRedemption(offerId);

  await sendConfirmationEmail(source, orderId, totals);

  logger.info(
    { data: [orderId, source.paymentIntentId] },
    "[Stripe Orders] Order recorded:"
  );
  return { orderId, created: true };
}

/** Records the order for a Checkout Session, if that session has been paid. */
export async function recordStripeOrderForSession(
  sessionId: string
): Promise<RecordedStripeOrder & { paid: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const source = await loadStripeOrderSource(session);
  if (!source) return { orderId: null, created: false, paid: false };
  return { ...(await recordStripeOrder(source)), paid: true };
}

/**
 * Records the order for a succeeded PaymentIntent. Returns null when the
 * intent did not come from a Checkout Session.
 */
export async function recordStripeOrderForPaymentIntent(
  paymentIntentId: string
): Promise<RecordedStripeOrder | null> {
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  if (!session) return null;
  const source = await loadStripeOrderSource(session, {
    paymentConfirmed: true,
  });
  if (!source) return null;
  return recordStripeOrder(source);
}
