import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia' as any,
});

export async function createCheckoutSession(
  userId: number,
  userEmail: string,
  userName: string | null | undefined,
  items: Array<{ productId: number; quantity: number; price: string }>,
  origin: string
) {
  const lineItems = items.map((item) => ({
    price_data: {
      currency: 'usd',
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

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName || 'Guest',
    },
    success_url: `${origin}/orders?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
    allow_promotion_codes: true,
  });

  return session;
}

export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function constructWebhookEvent(body: Buffer, sig: string, secret: string) {
  return stripe.webhooks.constructEvent(body, sig, secret);
}

export { stripe };
