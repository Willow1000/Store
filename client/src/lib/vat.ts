export type VatLineItemInput = {
  productId?: string | null;
  title?: string | null;
  unitPrice: number;
  quantity: number;
};

export type VatLineItemResult = {
  seed: string;
  rate: number;
  amount: number;
  quantity: number;
  unitPrice: number;
};

const MIN_VAT_RATE = 0.005; // 0.5%
const MAX_VAT_RATE = 0.03; // 3%
const RATE_STEPS = 2500;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeSeed(seed: string): string {
  return seed.trim().toLowerCase() || 'fallback_product_seed';
}

function hashString(seed: string): number {
  let hash = 2166136261;
  const normalized = normalizeSeed(seed);
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function getProductVatRate(seed: string): number {
  const hash = hashString(seed);
  const step = hash % (RATE_STEPS + 1);
  const rate = MIN_VAT_RATE + ((MAX_VAT_RATE - MIN_VAT_RATE) * step) / RATE_STEPS;
  return clampNumber(Number(rate.toFixed(4)), MIN_VAT_RATE, MAX_VAT_RATE);
}

export function calculateVariableVat(items: VatLineItemInput[]): {
  totalVat: number;
  weightedAverageRate: number;
  maxRate: number;
  lines: VatLineItemResult[];
} {
  let subtotal = 0;
  let totalVat = 0;
  let weightedRateNumerator = 0;

  const lines = items
    .filter((item) => item.quantity > 0 && item.unitPrice > 0)
    .map((item) => {
      const seed = item.productId || item.title || 'fallback_product_seed';
      const safeQuantity = Math.max(0, Math.floor(item.quantity));
      const safeUnitPrice = Math.max(0, item.unitPrice);
      const lineSubtotal = safeUnitPrice * safeQuantity;
      const rate = getProductVatRate(seed);
      const lineVat = roundToCents(lineSubtotal * rate);

      subtotal += lineSubtotal;
      totalVat += lineVat;
      weightedRateNumerator += lineSubtotal * rate;

      return {
        seed,
        rate,
        amount: lineVat,
        quantity: safeQuantity,
        unitPrice: safeUnitPrice,
      };
    });

  const weightedAverageRate = subtotal > 0 ? weightedRateNumerator / subtotal : 0;

  return {
    totalVat: roundToCents(totalVat),
    weightedAverageRate: Number(weightedAverageRate.toFixed(4)),
    maxRate: MAX_VAT_RATE,
    lines,
  };
}
