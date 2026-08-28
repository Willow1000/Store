import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia" as any,
});

export interface StripePaymentIntentInput {
  amount: number; // in cents
  email: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface StripeCheckoutInput {
  userId: number;
  userEmail: string;
  userName?: string | null;
  items: Array<{ productId: number; quantity: number; price: string }>;
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
  userId: number,
  userEmail: string,
  userName: string | null | undefined,
  items: Array<{ productId: number; quantity: number; price: string }>,
  origin: string,
  metadata?: Record<string, string>,
  charges: StripeCheckoutCharges = {}
) {
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
      currency: "usd",
      product_data: {
        name: `Product #${item.productId}`,
        metadata: {
          productId: item.productId.toString(),
        },
      },
      unit_amount: Math.round(parseFloat(item.price) * 100),
    },
    quantity: item.quantity,
  }));

  const shippingCents = Math.round((charges.shipping || 0) * 100);
  if (shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping", metadata: {} },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });
  }

  const taxCents = Math.round((charges.tax || 0) * 100);
  if (taxCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Tax", metadata: {} },
        unit_amount: taxCents,
      },
      quantity: 1,
    });
  }

  const sessionMetadata = {
    user_id: userId.toString(),
    customer_email: userEmail,
    customer_name: userName || "Guest",
    email: userEmail,
    items: JSON.stringify(items),
    ...metadata,
  };

  // Stripe Checkout Sessions can't combine allow_promotion_codes with an
  // explicit `discounts` array, and our discounts come from our own `offers`
  // table (not Stripe's promotion codes), so a discount coupon replaces
  // allow_promotion_codes rather than sitting alongside it.
  const discountCents = Math.round((charges.discountAmount || 0) * 100);
  let discounts: Array<{ coupon: string }> | undefined;
  if (discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountCents,
      currency: "usd",
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
    client_reference_id: userId.toString(),
    metadata: sessionMetadata,
    // Adaptive Pricing (on by default per the Stripe dashboard setting,
    // independent of anything in this code) converts the displayed/charged
    // amount to the customer's local currency based on their location. Our
    // line items are already computed in USD from the product catalog's
    // real prices, so this must stay off - otherwise the amount Stripe
    // actually shows/charges silently differs by the FX rate applied.
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
    ...(discounts ? { discounts } : { allow_promotion_codes: true }),
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
