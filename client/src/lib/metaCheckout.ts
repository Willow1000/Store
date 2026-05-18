export type MetaCartEntry = {
  productId: string;
  quantity: number;
};

export type MetaCheckoutParams = {
  products: string | null;
  coupon: string | null;
  fbclid: string | null;
  cart_origin: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  raw: Record<string, string>;
};

export const META_CART_ORIGINS = new Set(['facebook', 'instagram', 'meta_shops']);

const META_CHECKOUT_PARAM_KEYS = [
  'products',
  'coupon',
  'fbclid',
  'cart_origin',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
] as const;

function decodeMetaCheckoutValue(value: string | null): string | null {
  if (value === null) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeMetaCheckoutParams(searchParams: URLSearchParams): MetaCheckoutParams {
  const raw = Object.fromEntries(
    META_CHECKOUT_PARAM_KEYS.flatMap((key) => {
      const value = decodeMetaCheckoutValue(searchParams.get(key));
      return value === null ? [] : [[key, value]];
    })
  );

  return {
    products: raw.products ?? null,
    coupon: raw.coupon ?? null,
    fbclid: raw.fbclid ?? null,
    cart_origin: raw.cart_origin ?? null,
    utm_source: raw.utm_source ?? null,
    utm_medium: raw.utm_medium ?? null,
    utm_campaign: raw.utm_campaign ?? null,
    utm_content: raw.utm_content ?? null,
    raw: raw as Record<string, string>,
  };
}

export function parseMetaCheckoutParams(input: URLSearchParams | string): MetaCheckoutParams {
  const searchParams = typeof input === 'string'
    ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
    : input;

  return normalizeMetaCheckoutParams(searchParams);
}

export function parseMetaProductsParam(productsParam: string | null): MetaCartEntry[] {
  const normalizedProductsParam = decodeMetaCheckoutValue(productsParam);
  if (!normalizedProductsParam) return [];

  const entries = normalizedProductsParam
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawProductId, rawQuantity] = entry.split(':');
      const productId = (rawProductId || '').trim();
      const quantity = Number.parseInt((rawQuantity || '').trim(), 10);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      return {
        productId,
        quantity: Math.min(quantity, 99),
      };
    })
    .filter((value): value is MetaCartEntry => Boolean(value));

  // Merge duplicate product IDs while preserving order.
  const merged = new Map<string, number>();
  for (const entry of entries) {
    merged.set(entry.productId, (merged.get(entry.productId) || 0) + entry.quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function isMetaCheckoutRequest(searchParams: URLSearchParams, pathname: string): boolean {
  const cartOrigin = (searchParams.get('cart_origin') || '').toLowerCase();
  if (META_CART_ORIGINS.has(cartOrigin)) return true;

  if (pathname === '/checkout/meta') return true;

  return searchParams.has('products');
}

export function parseMetaCouponPercent(coupon: string | null): number {
  if (!coupon) return 0;
  const normalized = coupon.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) return 0;

  const match = normalized.match(/(\d{1,2})$/);
  if (!match) return 0;

  const percent = Number.parseInt(match[1], 10);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return 0;
  return percent;
}
