/**
 * Paystack API Integration
 * Handles charges, transaction verification, and order management
 */

import crypto from 'crypto';

interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

interface PaystackChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    authorization_url?: string;
    access_code?: string;
    display_text?: string;
    status: string;
  };
}

interface PaystackOrderLineItemInput {
  product: number;
  quantity: number;
}

interface PaystackCreateOrderPayload {
  customer: string | number;
  line_items: PaystackOrderLineItemInput[];
}

interface PaystackOrderLineItem {
  product: {
    id: number;
    name?: string;
  };
  quantity: number;
  amount: number;
}

interface PaystackOrderCustomer {
  id?: number;
  email?: string;
}

interface PaystackOrderData {
  id: number;
  code: string;
  amount: number;
  currency: string;
  status: string;
  valid?: boolean;
  customer?: PaystackOrderCustomer;
  line_items?: PaystackOrderLineItem[];
  createdAt?: string;
}

interface PaystackOrderListMeta {
  total?: number;
  skipped?: number;
  perPage?: number;
  page?: number;
  pageCount?: number;
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    channel: string;
    gateway_response: string;
    paid_at: string;
    authorization_code?: string;
  };
}

interface PaystackCustomMetadata {
  custom_fields?: Array<{
    display_name: string;
    variable_name: string;
    value: string;
  }>;
  [key: string]: unknown;
}

interface PaystackTransactionData {
  id: number;
  reference: string;
  amount: number;
  status: string;
  authorization_code?: string;
  authorization_url?: string;
  access_code?: string;
  currency?: string;
  paid_at?: string;
  channel?: string;
  gateway_response?: string;
}

interface PaystackChargeAuthorizationPayload {
  authorization_code: string;
  email: string;
  amount: number;
  reference?: string;
  plan?: string;
  currency?: string;
  metadata?: PaystackCustomMetadata;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
  invoice_limit?: number;
}

interface PaystackCheckAuthorizationPayload {
  authorization_code: string;
  email: string;
  amount: number;
  currency?: string;
}

interface PaystackReauthorizationPayload {
  authorization_code: string;
  email: string;
  amount: number;
  reference?: string;
  currency?: string;
  metadata?: PaystackCustomMetadata;
}

interface PaystackTransactionTimeline {
  time_spent: number;
  attempts: number;
  authentication: string;
  mode: string;
  fees: number;
  amounts_list: Array<{
    amount: number;
    currency: string;
  }>;
  total_amount: number;
  timeline: Array<{
    type: string;
    time: number;
    message?: string;
  }>;
}

interface PaystackTransactionTotals {
  total_transactions: number;
  total_volume: number;
  total_volume_by_currency: Array<{
    currency: string;
    amount: number;
  }>;
}

interface PaystackExportFilters {
  from?: string;
  to?: string;
  settled?: boolean;
  payment_page?: number;
  customer?: number;
  currency?: string;
  settlement?: number;
  amount?: number;
  status?: string;
}

interface PaystackInitializeTransactionPayload {
  email: string;
  amount: number;
  reference?: string;
  currency?: string;
  description?: string;
  metadata?: PaystackCustomMetadata;
  plan?: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
  invoice_limit?: number;
  split?: Record<string, unknown>;
}

interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Minimum transaction amounts (in subunits: cents for KES, kobo for NGN)
// KES: Ksh 3.00 = 300 cents; NGN: ₦ 50.00 = 5000 kobo
const MINIMUM_AMOUNT_CENTS = 300; // Ksh 3.00 for KES
const MINIMUM_AMOUNT_KOBO = 5000; // ₦ 50.00 for NGN

if (!SECRET_KEY) {
  console.warn('[Paystack] PAYSTACK_SECRET_KEY not configured in environment');
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<PaystackApiResponse<T>> {
  if (!SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

  const loggedBody = typeof init.body === 'string'
    ? (() => {
        try {
          return JSON.parse(init.body as string);
        } catch {
          return init.body;
        }
      })()
    : init.body;

  console.log('[Paystack] Outbound request:', {
    method: init.method || 'GET',
    path,
    body: loggedBody,
  });

  const response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET_KEY}`,
      ...(init.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Paystack] Request failed:', {
      path,
      status: response.status,
      data,
    });
    throw new Error(data.message || `Paystack request failed (${response.status})`);
  }

  return data as PaystackApiResponse<T>;
}

/**
 * Create a bank transfer charge
 * Generates a temporary bank account for the customer to transfer to
 * @param email - Customer email address
 * @param amountKES - Amount in Kenyan Shillings (KES)
 * @param expiryMinutes - Account expiration time in minutes (default: 30)
 * @throws Error if amount is below minimum (Ksh 3.00)
 */
export async function createBankTransferCharge(
  email: string,
  amountKES: number,
  expiryMinutes: number = 30
): Promise<PaystackChargeResponse> {
  // Convert KES to cents (1 KES = 100 cents)
  const amountInCents = Math.round(amountKES * 100);

  // Validate minimum amount (Ksh 3.00 = 300 cents)
  if (amountInCents < MINIMUM_AMOUNT_CENTS) {
    throw new Error(`Paystack bank transfer requires minimum amount of Ksh 3.00 (got Ksh ${amountKES})`);
  }

  // Validate email format
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address required for bank transfer');
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  const payload = {
    email,
    amount: amountInCents,
    bank_transfer: {
      account_expires_at: expiresAt.toISOString(),
    },
  };

  console.log('[Paystack] Creating bank transfer charge:', {
    email,
    amountKES,
    amountInCents,
    expiresAt: expiresAt.toISOString(),
  });

  try {
    return await paystackRequest<PaystackChargeResponse['data']>('/charge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[Paystack] Bank transfer charge error:', error);
    throw error;
  }
}

/**
 * Verify a payment transaction
 * @param reference - Transaction reference to verify
 * @returns Transaction verification details
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    return await paystackRequest<PaystackVerifyResponse['data']>(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('[Paystack] Verification error:', error);
    throw error;
  }
}

/**
 * Initialize a transaction
 * Must be called before collecting payment from the customer
 * Returns authorization URL for redirect or modal
 * @param payload - Contains email, amount (in kobo), and optional metadata
 * @returns Authorization URL, access code, and reference
 * @throws Error if required fields are missing or amount is invalid
 */
export async function initializeTransaction(
  payload: PaystackInitializeTransactionPayload,
): Promise<PaystackApiResponse<PaystackInitializeResponse>> {
  if (!payload.email || !payload.amount) {
    throw new Error('Initialize transaction requires email and amount');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Invalid email address provided');
  }

  if (payload.amount < MINIMUM_AMOUNT_KOBO) {
    throw new Error(`Paystack requires minimum amount of ${MINIMUM_AMOUNT_KOBO} kobo (got ${payload.amount})`);
  }

  // Generate reference if not provided
  const reference = payload.reference || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const body = {
    email: payload.email,
    amount: payload.amount,
    reference,
    ...(payload.currency && { currency: payload.currency }),
    ...(payload.description && { description: payload.description }),
    ...(payload.metadata && { metadata: payload.metadata }),
    ...(payload.plan && { plan: payload.plan }),
    ...(payload.subaccount && { subaccount: payload.subaccount }),
    ...(payload.transaction_charge && { transaction_charge: payload.transaction_charge }),
    ...(payload.bearer && { bearer: payload.bearer }),
    ...(payload.invoice_limit && { invoice_limit: payload.invoice_limit }),
    ...(payload.split && { split: payload.split }),
  };

  return paystackRequest<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Charge an authorization to complete recurring transactions
 * @param payload - Contains authorization_code, email, and amount (in kobo)
 * @returns Transaction response with reference and status
 * @throws Error if amount is invalid
 */
export async function chargeAuthorization(
  payload: PaystackChargeAuthorizationPayload,
): Promise<PaystackApiResponse<PaystackTransactionData>> {
  if (!payload.authorization_code || !payload.email || !payload.amount) {
    throw new Error('Charge authorization requires authorization_code, email, and amount');
  }

  if (payload.amount < MINIMUM_AMOUNT_KOBO) {
    throw new Error(`Paystack requires minimum amount of ${MINIMUM_AMOUNT_KOBO} kobo (got ${payload.amount})`);
  }

  return paystackRequest<PaystackTransactionData>('/transaction/charge_authorization', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Check if an authorization has sufficient funds
 * Test mode returns insufficient funds for amounts >= 500,000 naira
 * @param payload - Contains authorization_code, email, and amount (in kobo)
 * @returns Check result with authorization validity
 */
export async function checkAuthorization(
  payload: PaystackCheckAuthorizationPayload,
): Promise<PaystackApiResponse<{ authorization_code: string; bin: string; last4: string; exp_month: string; exp_year: string; card_type: string; bank: string; country_code: string; brand: string; reusable: boolean; signature: string }>> {
  if (!payload.authorization_code || !payload.email || !payload.amount) {
    throw new Error('Check authorization requires authorization_code, email, and amount');
  }

  return paystackRequest<{ authorization_code: string; bin: string; last4: string; exp_month: string; exp_year: string; card_type: string; bank: string; country_code: string; brand: string; reusable: boolean; signature: string }>(
    '/transaction/check_authorization',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Request reauthorization for a transaction
 * Returns a reauthorization URL valid for 2 hours and one-time use
 * @param payload - Contains authorization_code, email, and amount (in kobo)
 * @returns Response with reauthorization URL
 */
export async function requestReauthorization(
  payload: PaystackReauthorizationPayload,
): Promise<PaystackApiResponse<{ authorization_url: string; access_code: string; reference: string }>> {
  if (!payload.authorization_code || !payload.email || !payload.amount) {
    throw new Error('Reauthorization requires authorization_code, email, and amount');
  }

  return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/request_reauthorization',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * View transaction timeline
 * @param idOrReference - Transaction ID or reference code
 * @returns Detailed timeline of transaction attempts and authentication
 */
export async function viewTransactionTimeline(
  idOrReference: string | number,
): Promise<PaystackApiResponse<PaystackTransactionTimeline>> {
  return paystackRequest<PaystackTransactionTimeline>(
    `/transaction/timeline/${encodeURIComponent(String(idOrReference))}`,
    {
      method: 'GET',
    },
  );
}

/**
 * Get transaction totals for account
 * @param filters - Optional date filters (from and to as ISO strings)
 * @returns Total transactions, volume, and breakdown by currency
 */
export async function getTransactionTotals(
  filters: { from?: string; to?: string } = {},
): Promise<PaystackApiResponse<PaystackTransactionTotals>> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);

  const query = params.toString();
  return paystackRequest<PaystackTransactionTotals>(`/transaction/totals${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

/**
 * Export transactions
 * @param filters - Optional filters for settled status, date range, customer, currency, etc.
 * @returns CSV download or transaction list based on Paystack response
 */
export async function exportTransactions(
  filters: PaystackExportFilters = {},
): Promise<PaystackApiResponse<string | Array<PaystackTransactionData>>> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (typeof filters.settled === 'boolean') params.set('settled', String(filters.settled));
  if (filters.payment_page) params.set('payment_page', String(filters.payment_page));
  if (filters.customer) params.set('customer', String(filters.customer));
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.settlement) params.set('settlement', String(filters.settlement));
  if (filters.amount) params.set('amount', String(filters.amount));
  if (filters.status) params.set('status', filters.status);

  const query = params.toString();
  return paystackRequest<string | Array<PaystackTransactionData>>(`/transaction/export${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

/**
 * Fetch a transaction by ID
 * @param id - Transaction ID
 * @returns Transaction details
 */
export async function fetchTransaction(
  id: number,
): Promise<PaystackApiResponse<PaystackTransactionData>> {
  return paystackRequest<PaystackTransactionData>(`/transaction/${id}`, {
    method: 'GET',
  });
}

/**
 * Create an order for selected items
 */
export async function createPaystackOrder(
  payload: PaystackCreateOrderPayload,
): Promise<PaystackApiResponse<PaystackOrderData>> {
  const normalizedCustomer = typeof payload.customer === 'string'
    ? payload.customer.trim()
    : payload.customer;

  if ((typeof normalizedCustomer === 'string' && !normalizedCustomer) || payload.line_items.length === 0) {
    throw new Error('Paystack order requires a customer and at least one line item');
  }

  return paystackRequest<PaystackOrderData>('/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: normalizedCustomer,
      line_items: payload.line_items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      })),
    }),
  });
}

/**
 * List orders on the integration
 */
export async function listPaystackOrders(filters: {
  perPage?: number;
  page?: number;
  from?: string;
  to?: string;
} = {}): Promise<PaystackApiResponse<PaystackOrderData[]> & { meta?: PaystackOrderListMeta }> {
  const params = new URLSearchParams();

  if (typeof filters.perPage === 'number') params.set('perPage', String(filters.perPage));
  if (typeof filters.page === 'number') params.set('page', String(filters.page));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);

  const query = params.toString();
  return paystackRequest<PaystackOrderData[]>(`/order${query ? `?${query}` : ''}`, {
    method: 'GET',
  }) as Promise<PaystackApiResponse<PaystackOrderData[]> & { meta?: PaystackOrderListMeta }>;
}

/**
 * Fetch a single order by ID
 */
export async function fetchPaystackOrder(orderId: number): Promise<PaystackApiResponse<PaystackOrderData>> {
  return paystackRequest<PaystackOrderData>(`/order/${orderId}`, {
    method: 'GET',
  });
}

/**
 * Fetch all orders for a product
 */
export async function fetchPaystackProductOrders(productId: number): Promise<PaystackApiResponse<PaystackOrderData[]>> {
  return paystackRequest<PaystackOrderData[]>(`/order/product/${productId}`, {
    method: 'GET',
  });
}

/**
 * Validate a pay for me order
 */
export async function validatePaystackOrder(orderCode: string): Promise<PaystackApiResponse<PaystackOrderData>> {
  return paystackRequest<PaystackOrderData>(`/order/${encodeURIComponent(orderCode)}/validate`, {
    method: 'GET',
  });
}

/**
 * Verify webhook signature from Paystack
 * Uses HMAC SHA512 verification to ensure webhook authenticity
 * @param payload - Raw webhook payload body as string
 * @param signature - X-Paystack-Signature header value from webhook
 * @returns true if signature is valid, false otherwise
 * @security Critical for payment security - always verify before processing
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!SECRET_KEY) {
    console.warn('[Paystack] Cannot verify webhook without secret key');
    return false;
  }

  if (!signature) {
    console.warn('[Paystack] Webhook missing X-Paystack-Signature header');
    return false;
  }

  try {
    // Paystack uses HMAC SHA512 with the secret key
    const hash = crypto
      .createHmac('sha512', SECRET_KEY)
      .update(payload)
      .digest('hex');

    const isValid = hash === signature;

    if (!isValid) {
      console.error('[Paystack] Webhook signature verification failed', {
        expected: hash.substring(0, 16) + '...',
        received: signature.substring(0, 16) + '...',
      });
    }

    return isValid;
  } catch (error) {
    console.error('[Paystack] Webhook verification error:', error);
    return false;
  }
}
