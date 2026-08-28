# Stripe Payment Testing Guide

## Quick Setup

### 1. Install Stripe Dependencies

Run this command to install the frontend Stripe libraries:

```bash
pnpm add @stripe/js @stripe/react-stripe-js
```

### 2. Environment Variables Already Set

✅ Your `.env.local` now has:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_key
```

✅ Your `.env` has the STRIPE_SECRET_KEY

### 3. Add Webhook Secret (Optional for Testing Locally)

Add this to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdef
```

You can generate a test webhook secret from Stripe Dashboard → Developers → Webhooks

## Testing Stripe Payment

### 1. Start Your Application

```bash
pnpm dev
```

### 2. Navigate to Checkout

1. Add items to your cart
2. Click "Proceed to Checkout"
3. Fill in shipping details
4. Go to **Payment** step

### 3. Select Stripe

You'll see four payment options. **Stripe is now the default** 🎉

Options:
- **Stripe** (default) - Use this for testing
- **Visa** - Paystack integration
- **Mastercard** - Paystack integration
- **Apple Pay** - Coming soon

### 4. Test Card Numbers

Use these test card numbers in the Stripe card form:

| Card Type | Number | Expiry | CVC | Result |
|-----------|--------|--------|-----|--------|
| Visa | 4242 4242 4242 4242 | Any future date | Any 3 digits | ✅ Succeeds |
| Visa | 4000 0000 0000 0002 | Any future date | Any 3 digits | ❌ Declined |
| Visa | 4000 0025 0000 3155 | Any future date | Any 3 digits | 🔐 3D Secure |
| Mastercard | 5555 5555 5555 4444 | Any future date | Any 3 digits | ✅ Succeeds |

**Example:**
- Card Number: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`

### 5. Complete Payment

1. Mount the Stripe card element on the page
2. Enter test card details
3. Click "Pay $X.XX"
4. Watch the payment process
5. Get redirected to orders page on success

## What's New in Checkout

- ✨ Stripe is now the **default payment method**
- 🎯 **Stripe Payment Form** appears when Stripe is selected
- 📱 Responsive card element that works on mobile
- 🔒 Secure payment processing via Stripe Elements
- ⚡ Real-time card validation
- 🌐 Support for 150+ countries

## Webhook Testing (Advanced)

To test webhook events locally:

### Option 1: Stripe CLI (Recommended)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook in another terminal
stripe trigger payment_intent.succeeded
```

### Option 2: Ngrok

```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3000

# Update webhook URL in tests to use ngrok URL
# https://xxxx-xx-xxx-xx-xx.ngrok.io/api/webhooks/stripe
```

## Payment Flow

```
1. Customer adds items to cart
2. Proceeds to checkout
3. Fills shipping details
4. **Selects "Stripe" → Card form appears**
5. Enters test card details
6. Clicks "Pay $X.XX"
7. Stripe processes payment
8. Webhook notifies backend
9. Backend creates order & sends email
10. Customer redirected to /orders
```

## Database Records

After successful payment, check your database:

### Orders Table
- New order created with payment intent ID
- Status: `pending` (awaiting fulfillment)

### Payments Table
- New payment record with:
  - `provider`: 'stripe'
  - `reference`: Payment Intent ID
  - `status`: 'succeeded'
  - `amount`: Total amount paid
  - `cardLast4`: Last 4 digits of card
  - `cardBrand`: 'visa', 'mastercard', etc.

## Switching Between Test & Live Keys

### For Development (Currently Set)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51TQ97Y...
STRIPE_SECRET_KEY=sk_live_51TQ97Y...  # This should be sk_test_... for testing only
```

### For Production
1. Get LIVE keys from Stripe Dashboard
2. Update `.env.local`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_live_your_live_secret
```

## Troubleshooting

### Card Element Not Appearing
- ✅ Check browser console for errors
- ✅ Verify VITE_STRIPE_PUBLISHABLE_KEY is in .env.local
- ✅ Ensure Stripe dependencies are installed: `pnpm add @stripe/js @stripe/react-stripe-js`
- ✅ Clear browser cache and restart dev server

### Payment Fails With Declined Error
- ✅ Use test card that succeeds: `4242 4242 4242 4242`
- ✅ Check console for error message
- ✅ Verify email in checkout form is valid

### Order Not Created After Payment
- ✅ Check server logs for webhook errors
- ✅ Verify STRIPE_WEBHOOK_SECRET is set correctly
- ✅ Ensure backend is running and accessible
- ✅ Check database payments table for the payment record

### Console Says "Stripe failed to load"
- ✅ Check that VITE_STRIPE_PUBLISHABLE_KEY starts with `pk_test_` or `pk_live_`
- ✅ Verify the key is in `.env.local` (not `.env`)
- ✅ Restart dev server: `pnpm dev`

## Next Steps

1. ✅ Install dependencies: `pnpm add @stripe/js @stripe/react-stripe-js`
2. ✅ Test payment with test card
3. ✅ Check order created in database
4. ✅ Verify email sent
5. 🔜 Get your own Stripe keys
6. 🔜 Deploy to production
7. 🔜 Switch to live keys

## Files Modified

- ✅ `client/src/pages/Checkout.tsx` - Added Stripe as default payment option
- ✅ `client/src/components/StripePaymentForm.tsx` - Integrated payment form
- ✅ `server/routers.ts` - Added Stripe tRPC procedures
- ✅ `server/stripe.ts` - Enhanced with Payment Intents API
- ✅ `server/_core/app.ts` - Added webhook endpoint
- ✅ `.env.local` - Added Stripe test keys

## Support

- 📖 [Stripe Documentation](https://stripe.com/docs)
- 🔑 [API Keys](https://dashboard.stripe.com/test/apikeys)
- 🪝 [Webhooks](https://dashboard.stripe.com/test/webhooks)
- 💬 [Support](https://support.stripe.com)

---

**Ready to test? Run `pnpm dev` and head to checkout!** 🚀
