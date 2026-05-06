import { TRPCError } from '@trpc/server';
import { ENV } from './_core/env';

interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackInitializeTransactionPayload {
  email: string;
  amount: number;
  reference?: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}

interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const SECRET_KEY = ENV.paystackSecretKey;
const PUBLIC_KEY = ENV.paystackPublicKey;

if (!SECRET_KEY) {
  console.warn('[Paystack] PAYSTACK_SECRET_KEY not configured in environment');
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<PaystackApiResponse<T>> {
  if (!SECRET_KEY) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Paystack secret key not configured. Set PAYSTACK_SECRET_KEY in the environment.',
    });
  }

  const response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET_KEY}`,
      ...(init.headers ?? {}),
    },
  });

  let data: any;
  try {
    data = await response.json();
  } catch (parseErr) {
    const textBody = await response.text().catch(() => '<unable to read body>');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Paystack returned non-JSON response (status ${response.status}): ${String(textBody).slice(0,200)}`,
    });
  }

  if (!response.ok) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: data?.message || `Paystack request failed (${response.status})`,
    });
  }

  return data as PaystackApiResponse<T>;
}

export async function initializeTransaction(
  payload: PaystackInitializeTransactionPayload,
): Promise<PaystackApiResponse<PaystackInitializeResponse>> {
  if (!payload.email || !payload.amount) {
    throw new Error('Initialize transaction requires email and amount');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Invalid email address provided');
  }

  if (payload.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const reference = payload.reference || `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Amount is already in cents from client (e.g., 1 = $0.01, 100 = $1.00)
  // Paystack expects amount in the smallest currency unit

  return paystackRequest<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amount,
      reference,
      callback_url: payload.callback_url || process.env.PAYSTACK_CALLBACK_URL || undefined,
      ...(payload.currency ? { currency: payload.currency } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
    }),
  });
}

export async function verifyTransaction(reference: string) {
  if (!reference) throw new Error('Reference is required to verify transaction');

  return paystackRequest<{
    amount: number;
    currency: string;
    status: string;
    reference: string;
    domain: string;
    metadata: Record<string, unknown> | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
}

interface PrepareTransactionForClientResponse {
  publicKey: string;
  reference: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Prepare data for client-side inline Paystack popup (PaystackPop.newTransaction)
 * Example usage on client:
 * const popup = new PaystackPop();
 * popup.newTransaction({ key: PUBLIC_KEY, amount, email, reference, metadata });
 */
export function prepareTransactionForClient(
  payload: Pick<PaystackInitializeTransactionPayload, 'email' | 'amount' | 'currency' | 'description' | 'metadata' | 'reference'>,
): PrepareTransactionForClientResponse {
  if (!payload.email || !payload.amount) {
    throw new Error('Prepare transaction requires email and amount');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Invalid email address provided');
  }

  if (payload.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const reference = payload.reference || `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    publicKey: PUBLIC_KEY,
    reference,
    amount: payload.amount,
    currency: payload.currency,
    description: payload.description,
    metadata: payload.metadata,
  };
}