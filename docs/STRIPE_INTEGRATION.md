# Stripe Payment Integration Guide

## Overview

This guide documents the complete Stripe payment integration for the MotorVault e-commerce platform. The implementation supports real-time payment processing with webhook verification and order creation.

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```env
# Stripe API Keys (from https://dashboard.stripe.com/test/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Webhook Secret (from https://dashboard.stripe.com/test/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here
```

### Production Keys

For production deployment:

1. Generate production keys from your Stripe Dashboard
2. Update environment variables to use `pk_live_*` and `sk_live_*` keys
3. Configure webhook endpoint URL in Stripe Dashboard to point to your production domain

## Architecture

### Backend Components

#### 1. **Stripe Utilities** (`server/stripe.ts`)

Core functions for Stripe API integration:

- **`createPaymentIntent(input)`**: Creates a payment intent for immediate payment
  - Amount in cents (e.g., 9999 for $99.99)
  - Email, description, and metadata
  
- **`confirPaymentIntent(paymentIntentId, paymentMethod, returnUrl)`**: Confirms payment with payment method

- **`getPaymentIntent(paymentIntentId)`**: Retrieves payment intent status

- **`createCheckoutSession(...)`**: Creates a Stripe Checkout hosted session

- **`constructWebhookEvent(body, sig, secret)`**: Verifies and constructs webhook events

#### 2. **tRPC Procedures** (`server/routers.ts`)

Public procedures for client-server communication:

```typescript
// Create a payment intent
stripe.payments.createIntent({
  amount: number;        // in cents
  email: string;
  description?: string;
  metadata?: Record<string, string>;
})

// Get payment intent status
stripe.payments.getStatus({
  paymentIntentId: string;
})

// Confirm payment intent
stripe.payments.confirm({
  paymentIntentId: string;
  paymentMethod: string;
  returnUrl?: string;
})
```

#### 3. **Webhook Endpoint** (`server/_core/app.ts`)

Express endpoint at `/api/webhooks/stripe` that:

- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handles `payment_intent.succeeded` events:
  - Records payment details in the database
  - Creates an order with line items
  - Sends confirmation email to customer
- Handles `payment_intent.payment_failed` events:
  - Records failed payment attempt
  - Logs error details for debugging

### Frontend Components

#### 1. **Stripe Utility Library** (`client/src/lib/stripe.ts`)

Provides functions for:

- Loading Stripe.js library
- Initializing Stripe Elements
- Mounting/unmounting card elements
- Creating payment intents via tRPC
- Confirming payments
- Handling errors and card changes

#### 2. **Stripe Payment Form Component** (`client/src/components/StripePaymentForm.tsx`)

React component that:

- Initializes Stripe card element
- Handles card payment submission
- Displays validation errors
- Shows loading state during processing
- Communicates success/error to parent component

## Payment Flow

### Step 1: Initialize Payment

```typescript
// Frontend creates payment intent
const intent = await createPaymentIntent(
  amountInCents,
  customerEmail,
  'MotorVault Purchase',
  { items: JSON.stringify(cartItems) }
);
// Returns: { clientSecret, paymentIntentId, amount, status }
```

### Step 2: Collect Card Details

```typescript
// User enters card details in mounted stripe-card-element
// Card element handles PCI compliance automatically
```

### Step 3: Confirm Payment

```typescript
// Frontend confirms payment with Stripe
const { paymentIntent, error } = await confirmCardPayment(clientSecret);

if (paymentIntent.status === 'succeeded') {
  // Payment successful - webhook will create order
  navigate('/orders');
} else if (paymentIntent.status === 'requires_action') {
  // 3D Secure or SCA authentication required
  // Redirect to redirect_to_url
}
```

### Step 4: Webhook Processing

```
User payment → Stripe → Webhook Event (payment_intent.succeeded)
                            ↓
                    Verify signature
                            ↓
                    Record payment in DB
                            ↓
                    Create order
                            ↓
                    Send confirmation email
                            ↓
                    Return 200 OK to Stripe
```

## Integration with Checkout

### Adding Stripe to Checkout Page

```typescript
import StripePaymentForm from '@/components/StripePaymentForm';

// In Checkout component...
<StripePaymentForm
  amount={totalCents}
  email={formData.email}
  onSuccess={(paymentIntentId) => {
    // Payment succeeded - order created via webhook
    navigate(`/orders?payment_intent=${paymentIntentId}`);
  }}
  onError={(error) => {
    toast.error(error);
  }}
  disabled={isProcessing}
/>
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API Key` | Missing/wrong STRIPE_SECRET_KEY | Check environment variables |
| `Signature verification failed` | Wrong webhook secret | Update STRIPE_WEBHOOK_SECRET |
| `card_declined` | Card rejected by issuer | Ask user to try different card |
| `insufficient_funds` | Insufficient card balance | Ask user to try different card |
| `processing_error` | Stripe service issue | Retry payment |

### Webhook Debugging

Enable debug logging:

```typescript
// In server/stripe.ts or webhook handler
console.log('[Stripe Webhook] Event:', event.type, event.id);
```

Check webhook deliveries:
- Dashboard → Developers → Webhooks → Event Details

## Testing

### Test Card Numbers

| Card | Number | Outcome |
|------|--------|---------|
| Visa | 4242 4242 4242 4242 | Succeeds |
| Visa | 4000 0000 0000 0002 | Declined |
| Visa | 4000 0025 0000 3155 | 3D Secure required |
| Mastercard | 5555 5555 5555 4444 | Succeeds |

### Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Listen for webhook events
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Run test event
stripe trigger payment_intent.succeeded
```

## Security Considerations

1. **API Keys**: Never expose `STRIPE_SECRET_KEY` on frontend
2. **PCI Compliance**: Use Stripe Elements (handles PCI compliance)
3. **Webhook Verification**: Always verify signature with webhook secret
4. **HTTPs**: Webhooks must be received over HTTPS in production
5. **Idempotency**: Webhook handler is idempotent (safe for retries)

## Database Schema

### Payments Table

Stores payment transaction details:

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  orderId INTEGER NOT NULL REFERENCES orders(id),
  userId INTEGER NOT NULL REFERENCES users(id),
  provider VARCHAR(50),        -- 'stripe', 'paystack'
  reference VARCHAR(255),      -- Payment Intent ID
  amount DECIMAL(10,2),
  currency VARCHAR(3),         -- 'USD', 'NGN'
  status VARCHAR(50),          -- 'succeeded', 'failed', 'pending'
  channel VARCHAR(50),         -- 'card', 'bank_transfer'
  gatewayResponse TEXT,
  authorizationCode VARCHAR(255),
  cardBin VARCHAR(6),
  cardLast4 VARCHAR(4),
  cardBrand VARCHAR(50),
  bank VARCHAR(50),
  ipAddress VARCHAR(45),
  metadata JSONB,
  fees DECIMAL(10,2),
  paidAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Monitoring

### Key Metrics to Monitor

- Payment success rate
- Average payment processing time
- Failed payment reasons
- Webhook delivery status
- Customer disputes/chargebacks

### Useful Dashboard Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Test Payments](https://dashboard.stripe.com/test/payments)
- [Webhooks](https://dashboard.stripe.com/test/webhooks)
- [API Logs](https://dashboard.stripe.com/test/logs)

## Troubleshooting

### Payment Intent Not Created

```
Error: Missing VITE_STRIPE_PUBLISHABLE_KEY
```

**Solution**: Add key to `.env.local`

### Webhook Not Received

1. Check webhook secret is correct
2. Verify HTTPS for production
3. Check firewall/network restrictions
4. Review webhook logs in Stripe Dashboard

### Card Declined

1. Ensure card is valid and not expired
2. Check card has sufficient funds
3. Verify billing address matches
4. For test, use test card numbers above

## Migration from Paystack

Both Paystack and Stripe payment methods coexist:

- **Paystack**: Used via Paystack Popup Modal
- **Stripe**: Used via custom payment form

Frontend can offer both options:

```typescript
// Checkout page offers both
<select value={paymentMethod}>
  <option value="stripe">Stripe (Card)</option>
  <option value="paystack">Paystack (Card)</option>
</select>
```

## References

- [Stripe Payment Intents API](https://stripe.com/docs/api/payment_intents)
- [Stripe Elements](https://stripe.com/docs/stripe-js/elements/payment-request-button)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [3D Secure (SCA) Authentication](https://stripe.com/docs/payments/3d-secure)
