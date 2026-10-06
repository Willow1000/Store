import Stripe from "stripe";
import { toStripeMinorUnits, type ChargeConversion } from "./currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia" as any,
});

export interface StripePaymentIntentInput {
  amount: number; // in cents
  email: string;
  metadata?: Record<string, string>;
  description?: string;
}

/**
 * One catalogue product in a checkout. `productId` is the product's uuid in
 * the Supabase `products` table, and `price` its unit price in USD.
 */
export interface StripeCheckoutItem {
  productId: string;
  quantity: number;
  price: string;
  /** Product title, shown to the customer on Stripe's page and receipt. */
  name?: string;
}

export interface StripeCheckoutInput {
  userId: string | null;
  userEmail: string;
  userName?: string | null;
  items: StripeCheckoutItem[];
  origin: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Payment Intent for immediate payment (recommended for custom payment forms)
 */
export async function createPaymentIntent(input: StripePaymentIntentInput) {
  return stripe.paymentIntents.create({
    amount: input.amount,
    currency: "usd",
    payment_method_types: ["card"],
    statement_descriptor: "MotorVault Purchase",
    metadata: input.metadata || {},
    description: input.description,
    receipt_email: input.email,
  });
}

/**
 * Retrieve a Payment Intent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Confirm a Payment Intent (used for payment confirmation with payment method)
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethod: string,
  returnUrl?: string
) {
  return stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethod,
    return_url: returnUrl,
  });
}

export interface StripeCheckoutCharges {
  /** Shipping cost in dollars, added as its own line item when > 0. */
  shipping?: number;
  /** Tax/VAT in dollars, added as its own line item when > 0. */
  tax?: number;
  /** Discount in dollars, applied as a one-off Stripe coupon when > 0. */
  discountAmount?: number;
  /** Offer code, used only to label the generated coupon. */
  offerCode?: string;
}

/**
 * Create a Checkout Session (for hosted checkout)
 *
 * The line items built from `items` only cover the product subtotal - the
 * session metadata previously carried subtotal/shipping/tax/discountAmount
 * for the webhook's records, but nothing actually added shipping/tax to the
 * charge or subtracted the discount, so the amount Stripe collected didn't
 * match the total shown to the customer. `charges` makes those real parts
 * of what's charged.
 */
export async function createCheckoutSession(
  /** Supabase user id (uuid), or null for a guest checkout. */
  userId: string | null,
  userEmail: string,
  userName: string | null | undefined,
  items: StripeCheckoutItem[],
  origin: string,
  metadata?: Record<string, string>,
  charges: StripeCheckoutCharges = {},
  conversion: ChargeConversion = {
    currency: "USD",
    rate: 1,
    convert: (usd: number) => usd,
  }
) {
  // Catalogue prices are USD. The session is created in the visitor's regional
  // currency using a rate resolved once on the server, so the customer is
  // charged in the currency the storefront quoted rather than being shown a
  // dollar figure at the last step.
  const chargeCurrency = conversion.currency.toLowerCase();
  const toMinor = (usdAmount: number) =>
    toStripeMinorUnits(conversion.convert(usdAmount), conversion.currency);
  type LineItem = {
    price_data: {
      currency: string;
      product_data: { name: string; metadata: Record<string, string> };
      unit_amount: number;
    };
    quantity: number;
  };

  const lineItems: LineItem[] = items.map(item => ({
    price_data: {
      currency: chargeCurrency,
      product_data: {
        // Stripe caps a product name at 250 characters.
        name: (item.name || `Product ${item.productId}`).slice(0, 250),
        // Read back by server/stripeOrders.ts to build the order's line items.
        metadata: {
          productId: item.productId,
          usdPrice: parseFloat(item.price).toFixed(2),
        },
      },
      unit_amount: toMinor(parseFloat(item.price)),
    },
    quantity: item.quantity,
  }));

  const shippingMinor = toMinor(charges.shipping || 0);
  if (shippingMinor > 0) {
    lineItems.push({
      price_data: {
        currency: chargeCurrency,
        product_data: { name: "Shipping", metadata: {} },
        unit_amount: shippingMinor,
      },
      quantity: 1,
    });
  }

  const taxMinor = toMinor(charges.tax || 0);
  if (taxMinor > 0) {
    lineItems.push({
      price_data: {
        currency: chargeCurrency,
        product_data: { name: "Tax", metadata: {} },
        unit_amount: taxMinor,
      },
      quantity: 1,
    });
  }

  const sessionMetadata = {
    user_id: userId || "",
    customer_email: userEmail,
    customer_name: userName || "Guest",
    email: userEmail,
    // The purchased items are NOT copied here: a metadata value is capped at
    // 500 characters, which a cart of uuid-keyed items overflows. They are read
    // from the session's line items instead.
    ...metadata,
  };

  // Promo codes are the store's own (`offers` table), entered on the site's
  // checkout page and applied here as a one-off Stripe coupon. Stripe's own
  // "Add promotion code" box is NOT offered: no codes exist in Stripe, so
  // every code typed there was rejected (400), and a code Stripe did accept
  // would bypass the server-side pricing and never reach the order record.
  // The coupon's currency must match the session's, or Stripe rejects it.
  const discountMinor = toMinor(charges.discountAmount || 0);
  let discounts: Array<{ coupon: string }> | undefined;
  if (discountMinor > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountMinor,
      currency: chargeCurrency,
      duration: "once",
      name: charges.offerCode ? `Discount (${charges.offerCode})` : "Discount",
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: userEmail,
    ...(userId ? { client_reference_id: userId } : {}),
    metadata: sessionMetadata,
    // Adaptive Pricing (on by default per the Stripe dashboard setting,
    // independent of anything in this code) converts the charged amount to the
    // customer's local currency using Stripe's own rate. The line items above
    // are ALREADY in the visitor's regional currency, converted with the rate
    // the storefront quoted, so leaving this on would convert a second time
    // and charge something neither the customer nor this server quoted.
    adaptive_pricing: { enabled: false },
    // Checkout Session metadata is NOT copied to the underlying PaymentIntent
    // automatically — the webhook handles `payment_intent.succeeded` and reads
    // paymentIntent.metadata, so it must be duplicated here.
    payment_intent_data: {
      metadata: sessionMetadata,
      receipt_email: userEmail,
    },
    success_url: `${origin}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?payment=cancelled`,
    ...(discounts ? { discounts } : {}),
  });

  return session;
}

/**
 * Retrieve a Checkout Session by ID
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Construct and verify a Stripe webhook event
 */
export async function constructWebhookEvent(
  body: Buffer,
  sig: string,
  secret: string
) {
  return stripe.webhooks.constructEvent(body, sig, secret);
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
}

/**
 * Refund a payment intent
 */
export async function refundPayment(
  paymentIntentId: string,
  amountInCents?: number
) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountInCents,
  });
}

export { stripe };
