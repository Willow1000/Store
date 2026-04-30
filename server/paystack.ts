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
}

interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!SECRET_KEY) {
  console.warn('[Paystack] PAYSTACK_SECRET_KEY not configured in environment');
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<PaystackApiResponse<T>> {
  if (!SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

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
    throw new Error(data.message || `Paystack request failed (${response.status})`);
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

  return paystackRequest<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amount,
      reference,
      ...(payload.currency ? { currency: payload.currency } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
    }),
  });
}