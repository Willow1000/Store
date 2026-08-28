/**
 * Stripe Checkout Integration (Hosted Checkout)
 *
 * This module handles redirecting users to Stripe's hosted checkout page,
 * similar to how Paystack works. Users enter their card details on Stripe's secure page.
 */

import { trpcClient } from "./trpc";

export interface StripeCheckoutInput {
  userId?: number;
  email: string;
  userName?: string;
  items: Array<{
    productId: number;
    quantity: number;
    price: string;
  }>;
  subtotal: string;
  shipping?: string;
  tax?: string;
  total: string;
  discountAmount?: string;
  offerCode?: string;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  language?: string;
  origin?: string;
}

/**
 * Redirect user to Stripe Checkout
 */
export async function redirectToStripeCheckout(
  input: StripeCheckoutInput
): Promise<void> {
  try {
    const response =
      await trpcClient.stripe.payments.createCheckoutSession.mutate({
        userId: input.userId,
        email: input.email,
        userName: input.userName,
        items: input.items,
        subtotal: input.subtotal,
        shipping: input.shipping,
        tax: input.tax,
        total: input.total,
        discountAmount: input.discountAmount,
        offerCode: input.offerCode,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        language: input.language,
        origin: window.location.origin,
      });

    if (!response.url) {
      throw new Error("No checkout URL received from Stripe");
    }

    // Redirect to Stripe Checkout
    window.location.href = response.url;
  } catch (error) {
    throw error;
  }
}
