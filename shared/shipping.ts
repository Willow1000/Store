/**
 * Calculate shipping cost based on subtotal
 * Shipping policy (USD):
 * - Orders under 1500: 5% of subtotal
 * - Orders 1500 and above: free
 */
export function calculateShipping(subtotal: number): number {
  const amount = Number(subtotal);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount >= 1500) return 0;
  const shipping = amount * 0.05;
  return Math.round(shipping * 100) / 100;
}

export function isFreeShippingEligible(subtotal: number): boolean {
  const amount = Number(subtotal);
  return Number.isFinite(amount) && amount >= 1500;
}

export function getFreeShippingThresholdUsd(): number {
  return 1500;
}

/**
 * Format price for display (default USD)
 */
export function formatPrice(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}
