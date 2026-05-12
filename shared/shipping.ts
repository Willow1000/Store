/**
 * Calculate shipping cost based on subtotal
 * Free shipping for orders >= $1500 USD
 * Otherwise 5% of the subtotal
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal >= 1500) {
    return 0;
  }
  return Number((subtotal * 0.05).toFixed(2));
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
