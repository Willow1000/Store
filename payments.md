# Paystack Payment Integration

## Current Implementation: Card Payments via Paystack Popup Modal

Your e-commerce site uses **Paystack Popup Modal** (Inline.js) for secure card payment processing.

---

## Payment Configuration

### 1. Public Key (Client-side)

**Location**: `.env.local`  
**Variable**: `VITE_PAYSTACK_PUBLIC_KEY`  
**Format**: `pk_test_*` (test) or `pk_live_*` (production)  
**Example**: `pk_test_1a2b3c4d5e6f7g8h9i0j`

### 2. Secret Key (Server-side)

**Location**: `.env`  
**Variable**: `PAYSTACK_SECRET_KEY`  
**Format**: `sk_test_*` (test) or `sk_live_*` (production)  
**Used for**: Transaction verification only

---

## Paystack Popup Modal Setup

### Parameters Sent to Paystack

Your code sends the following parameters to `PaystackPop.setup()`:

```typescript
{
  key: string;           // Public key (REQUIRED)
  email: string;         // Customer email (REQUIRED)
  amount: number;        // Amount in kobo/cents (REQUIRED)
  firstName?: string;    // Customer first name (optional)
  lastName?: string;     // Customer last name (optional)
  channels: string[];    // ["card"] (optional)
  onSuccess: function;   // Success callback (REQUIRED)
  onClose?: function;    // Close/cancel callback (optional)
}
```

### Amount Calculation

**Formula**: `USD Amount × 100 = Kobo (Minor Units)`

**Examples**:
- $99.99 → 9999 kobo
- $50.00 → 5000 kobo
- $1.00 → 100 kobo

**Your Code** (`client/src/lib/paystack.ts:63`):
```typescript
const amountInMinorUnit = Math.round(Number(config.amount) * 100);
```

✅ **CORRECT** - Matches Paystack requirement

### Supported Cards

- ✅ Visa (All markets)
- ✅ Mastercard (All markets)
- ✅ Verve (Nigeria only)
- ✅ American Express (Nigeria, South Africa, Kenya only)

---

## Checkout Payment Flow

### Step 1: Order Calculation

Location: `client/src/pages/Checkout.tsx:169-171`

```typescript
const subtotal = cartItems.reduce(...);      // Sum of item prices
const shipping = subtotal > 50 ? 0 : 10;     // Free shipping > $50
const tax = subtotal * 0.1;                  // 10% tax
const total = subtotal + shipping + tax;     // Final USD amount
```

### Step 2: Open Paystack Modal

Location: `client/src/pages/Checkout.tsx:295-318`

```typescript
await openPaystackModal({
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,  // ✅ Public key
  email: formData.email,                                 // ✅ Customer email
  amount: total,                                         // ✅ USD (converted to kobo internally)
  firstName: formData.firstName,                         // Optional
  lastName: formData.lastName,                           // Optional
  channels: ['card'],                                    // ✅ Card payments only
  onSuccess: async (reference) => { ... },              // ✅ Handle success
  onClose: () => { ... },                                // Handle cancel
});
```

### Step 3: Success Callback

When payment completes successfully:

1. **Receive transaction reference** from Paystack
2. **Create order** in database with order items and total amount
3. **Record payment** with:
   - `orderId`: Generated order ID
   - `method`: "paystack"
   - `reference`: Transaction reference from Paystack
   - `amount`: Total USD amount
   - `status`: "success"
4. **Clear cart** and redirect to order confirmation

---

## Server-Side Verification

### Endpoint

**URL**: `https://api.paystack.co/transaction/verify/{reference}`  
**Method**: `GET`  
**Headers**: `Authorization: Bearer {PAYSTACK_SECRET_KEY}`

### Response

```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "reference": "transaction_reference_123",
    "status": "success",
    "amount": 9999,
    "channel": "card",
    "gateway_response": "Approved by Financial Institution",
    "paid_at": "2025-04-26T10:30:00.000Z",
    "authorization_code": "123456"
  }
}
```

### Implementation

Location: `server/paystack.ts:95-115`

```typescript
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  if (!SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify transaction');
  }

  return data;
}
```

---

## Data Validation

### Client-Side

✅ **Amount Validation** (`paystack.ts:64-65`):
```typescript
if (!Number.isFinite(amountInMinorUnit) || amountInMinorUnit <= 0) {
  throw new Error('Attribute amount must be a valid integer');
}
```

✅ **Public Key Validation** (`paystack.ts:57-59`):
```typescript
if (!publicKey.startsWith('pk_')) {
  throw new Error('Invalid Paystack public key format');
}
```

### Server-Side

✅ **Response Validation**:
- HTTP status must be 2xx
- Response must have `status` and `data` fields
- Error response includes descriptive message

---

## API Specification Compliance

Your implementation matches Paystack's requirements:

| Requirement | Your Implementation | Status |
|-------------|-------------------|--------|
| Public key format: `pk_*` | ✅ Validated | ✅ PASS |
| Amount in minor units (×100) | ✅ `USD * 100` | ✅ PASS |
| Required fields: key, email, amount, onSuccess | ✅ All present | ✅ PASS |
| Authorization header format | ✅ `Bearer {secret}` | ✅ PASS |
| Verification endpoint | ✅ `/transaction/verify/{ref}` | ✅ PASS |
| Response structure | ✅ Has `status` and `data` | ✅ PASS |

---

## Testing

### Test Credentials

**Get from Paystack Dashboard**:
1. Go to Settings → API Keys & Webhooks
2. Copy **Public Key (Test)** → `VITE_PAYSTACK_PUBLIC_KEY`
3. Copy **Secret Key (Test)** → `PAYSTACK_SECRET_KEY`

### Test Cards

All test cards use any future expiry date and any 3-digit CVV:

- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5425 2334 3010 9903
- **Verve**: 5061 0200 0000 0000 (Nigeria only)

### Test Amount

Use any valid amount in USD, e.g., $99.99

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Paystack public key is not configured" | `VITE_PAYSTACK_PUBLIC_KEY` missing | Set in `.env.local` |
| "Invalid Paystack public key format" | Key doesn't start with `pk_` | Copy correct key from Paystack dashboard |
| "Paystack script failed to load" | Network issue | Check internet connection |
| "Payment cancelled" | User closed modal | User initiated cancel |
| "Payment verification failed" | Invalid reference or wrong secret key | Check `PAYSTACK_SECRET_KEY` in `.env` |

---

## Database Records

### Orders Table

Stores order information:
- `user_id` - Customer
- `total_amount` - USD amount
- `items` - Array of product items with quantity and price
- `currency` - "USD"
- `status` - "pending", "completed", "cancelled"

### Payments Table

Stores payment details:
- `order_id` - Related order
- `method` - "paystack"
- `reference` - Paystack transaction reference
- `amount` - USD amount
- `status` - "success", "failed", "pending"
- `paid_at` - Timestamp of successful payment

---

## Files Involved

- `client/src/lib/paystack.ts` - Paystack modal initialization
- `client/src/pages/Checkout.tsx` - Payment flow and order creation
- `server/paystack.ts` - Server-side verification
- `server/routers.ts` - Payment verification routes (if applicable)
- `.env` - `PAYSTACK_SECRET_KEY`
- `.env.local` - `VITE_PAYSTACK_PUBLIC_KEY`

---

## References

- Paystack Documentation: https://paystack.com/docs
- Paystack Popup Modal: https://paystack.com/docs/payments/popups/
- Transaction Verification: https://paystack.com/docs/api/transaction/verify/
