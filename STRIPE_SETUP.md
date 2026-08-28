# Stripe Payment Implementation Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @stripe/js @stripe/react-stripe-js
```

Or run the installation script:

```bash
bash scripts/install-stripe.sh
```

### 2. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in to your Stripe account
3. Navigate to **Developers** → **API Keys**
4. Copy both **Publishable Key** and **Secret Key**

### 3. Configure Environment Variables

#### `.env.local` (Frontend - Visible to Browser)

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

#### `.env` (Backend - Server Only)

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here
```

### 4. Setup Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add an endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** and add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 5. Configure Stripe for Your Domain

1. Dashboard → **Settings** → **Webhooks**
2. Whitelist your domain for CORS

### 6. Test Locally

#### Option A: Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Authenticate
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger payment_intent.succeeded
```

#### Option B: Using Ngrok

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Use ngrok URL for webhook configuration
# https://xxxx-xx-xxx-xx-xx.ngrok.io/api/webhooks/stripe
```

### 7. Add Stripe to Checkout

In `client/src/pages/Checkout.tsx`:

```typescript
import StripePaymentForm from '@/components/StripePaymentForm';

// In your payment method selection...
{selectedPayment === 'stripe' && (
  <StripePaymentForm
    amount={Math.round(totalCents)}
    email={formData.email}
    onSuccess={(paymentIntentId) => {
      // Payment succeeded, order created via webhook
      navigate(`/orders?stripe_pi=${paymentIntentId}`);
    }}
    onError={(error) => {
      toast.error(`Payment failed: ${error}`);
    }}
    disabled={isProcessing}
  />
)}
```

## Architecture Overview

```
Frontend (React)
    ↓
    Create Payment Intent (tRPC)
    ↓
Backend (Node.js)
    ↓
    Stripe API
    ↓
    Return clientSecret
    ↓
Frontend (Stripe.js)
    ↓
    Collect Card Details
    ↓
    Confirm Payment
    ↓
    Stripe Returns Status
    ↓
If succeeded:
    Webhook → Backend
         ↓
      Create Order
         ↓
      Send Email
         ↓
      Database Record
```

## Testing

### Test Card Numbers

```
Card Type       Number                  Result
Visa            4242 4242 4242 4242     Succeeds
Visa            4000 0000 0000 0002     Declined
Visa            4000 0025 0000 3155     3D Secure Required
Mastercard      5555 5555 5555 4444     Succeeds
American Exp    3782 822463 10005       Succeeds
```

### Test Expiry & CVC

- **Any future date** (e.g., 12/25)
- **Any 3-digit CVC** (e.g., 123)

### Test with Different Scenarios

| Goal                | Card Number         | Expiry     | CVC          |
| ------------------- | ------------------- | ---------- | ------------ |
| Successful payment  | 4242 4242 4242 4242 | Any future | Any 3 digits |
| Declined payment    | 4000 0000 0000 0002 | Any future | Any 3 digits |
| Auth required (3DS) | 4000 0025 0000 3155 | Any future | Any 3 digits |
| Insufficient funds  | 4000 0000 0000 9995 | Any future | Any 3 digits |

## API Endpoints

### Create Payment Intent

**POST** `/api/trpc/stripe.payments.createIntent`

```json
{
  "input": {
    "amount": 9999,
    "email": "customer@example.com",
    "description": "Order #123",
    "metadata": {
      "items": "[{\"productId\": 1, \"quantity\": 2}]",
      "orderId": "123"
    }
  }
}
```

**Response:**

```json
{
  "result": {
    "data": {
      "clientSecret": "pi_xxx_secret_xxx",
      "paymentIntentId": "pi_xxx",
      "amount": 9999,
      "status": "requires_payment_method"
    }
  }
}
```

### Get Payment Status

**POST** `/api/trpc/stripe.payments.getStatus`

```json
{
  "input": {
    "paymentIntentId": "pi_xxx"
  }
}
```

### Confirm Payment

**POST** `/api/trpc/stripe.payments.confirm`

```json
{
  "input": {
    "paymentIntentId": "pi_xxx",
    "paymentMethod": "pm_xxx",
    "returnUrl": "https://yourdomain.com/orders"
  }
}
```

### Webhook Handler

**POST** `/api/webhooks/stripe`

Handles events:

- `payment_intent.succeeded` - Creates order, records payment
- `payment_intent.payment_failed` - Records failed attempt

## Database Integration

Orders are automatically created when:

1. Payment Intent status becomes `succeeded`
2. Webhook event is received and verified
3. User ID is found in metadata
4. Line items are present

**Payment Record Fields:**

```typescript
{
  orderId: number;
  userId: number;
  provider: "stripe";
  reference: string; // Payment Intent ID
  amount: number; // in cents
  currency: string; // 'USD'
  status: "succeeded" | "failed";
  channel: "card" | "bank_transfer";
  gatewayResponse: string;
  authorizationCode: string;
  cardLast4: string;
  cardBrand: string; // 'visa', 'mastercard', etc.
  metadata: JSON;
  paidAt: Date;
}
```

## Troubleshooting

### "Stripe failed to load"

**Cause:** `VITE_STRIPE_PUBLISHABLE_KEY` not set

**Solution:**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

### "Webhook signature verification failed"

**Cause:** Wrong `STRIPE_WEBHOOK_SECRET`

**Solution:**

1. Get correct webhook secret from Dashboard → Webhooks
2. Update `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_test_your_secret
```

### "Payment intent not received"

**Cause:** Backend not running or Stripe key is wrong

**Solution:**

1. Verify backend is running: `pnpm dev`
2. Check `STRIPE_SECRET_KEY` in `.env`
3. Check console logs for errors

### Card element not rendering

**Cause:** Missing CSS or element not mounted

**Solution:**

1. Ensure TailwindCSS is loaded
2. Check browser console for errors
3. Verify `stripe-card-element` div exists

### 3D Secure (SCA) challenges fail

**Cause:** Client secret or return URL incorrect

**Solution:**

1. Ensure `returnUrl` is set to valid domain
2. Use Stripe test card: `4000 0025 0000 3155`
3. Complete the 3DS flow in popup

## Security Checklist

- [ ] Secret key is never exposed to frontend
- [ ] Webhook signature is always verified
- [ ] HTTPS is enforced in production
- [ ] Webhook retries are handled idempotently
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting is enabled on webhook endpoint
- [ ] PII is not logged to console
- [ ] Card data is handled by Stripe Elements only

## Production Deployment

### 1. Switch to Live Keys

```env
# Replace test keys with live keys from Stripe Dashboard
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_live_your_webhook_secret
```

### 2. Configure Webhook URL

1. Dashboard → Webhooks
2. Update endpoint URL to your production domain
3. Re-generate signing secret
4. Update `STRIPE_WEBHOOK_SECRET`

### 3. Enable HTTPS

Webhooks only work with HTTPS in production

### 4. Test Payment Flow

1. Create test order with live test card
2. Verify webhook delivery in Dashboard
3. Confirm order appears in database
4. Verify confirmation email sent

### 5. Monitor

- Dashboard → Payments → View all payments
- Dashboard → Webhooks → Recent deliveries
- Your app logs for errors

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com)
- [Community Chat](https://slack.stripe.dev)

## Additional Resources

- **Full Integration Guide**: See `docs/STRIPE_INTEGRATION.md`
- **Component Source**: `client/src/components/StripePaymentForm.tsx`
- **Utilities**: `client/src/lib/stripe.ts`
- **Server Setup**: `server/stripe.ts` and `server/routers.ts`
