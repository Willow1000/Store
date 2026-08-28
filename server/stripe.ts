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

/**
 * Create a Checkout Session (for hosted checkout)
 */
export async function createCheckoutSession(
  userId: number,
  userEmail: string,
  userName: string | null | undefined,
  items: Array<{ productId: number; quantity: number; price: string }>,
  origin: string,
  metadata?: Record<string, string>
) {
  const lineItems = items.map(item => ({
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

  const sessionMetadata = {
    user_id: userId.toString(),
    customer_email: userEmail,
    customer_name: userName || "Guest",
    email: userEmail,
    items: JSON.stringify(items),
    ...metadata,
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: sessionMetadata,
    // Checkout Session metadata is NOT copied to the underlying PaymentIntent
    // automatically — the webhook handles `payment_intent.succeeded` and reads
    // paymentIntent.metadata, so it must be duplicated here.
    payment_intent_data: {
      metadata: sessionMetadata,
      receipt_email: userEmail,
    },
    success_url: `${origin}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?payment=cancelled`,
    allow_promotion_codes: true,
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
