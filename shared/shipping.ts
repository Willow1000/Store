/**
 * Calculate shipping cost based on subtotal
 * Free delivery for orders > $250 USD
 * Otherwise 10% of the subtotal
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal > 250) {
    return 0;
  }
  return Number((subtotal * 0.1).toFixed(2));
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
