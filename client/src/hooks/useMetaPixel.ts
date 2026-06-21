/**
 * Hook to track Meta Pixel events
 * Usage:
 *   const trackPixel = useMetaPixel();
 *   trackPixel('AddToCart', { value: 99.99, currency: 'USD' });
 */

export function useMetaPixel() {
  return (event: string, data?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', event, data || {});
    }
  };
}

function canTrack(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).fbq === 'function';
}

function roundMoney(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

function normalizeCurrency(currency: string | null | undefined): string | null {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

/**
 * Track a ViewContent event
 * Call this when a user views a product page
 */
export function trackViewContent(productId: string, title: string, price: number) {
  const value = roundMoney(price);
  if (canTrack() && productId && value !== null) {
    (window as any).fbq('track', 'ViewContent', {
      content_ids: [productId],
      content_name: title,
      value,
      currency: 'USD',
      content_type: 'product',
    });
  }
}

/**
 * Track an AddToCart event
 * Call this when a user adds an item to their cart
 */
export function trackAddToCart(productId: string, title: string, price: number, quantity = 1) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const value = roundMoney(price * safeQuantity);
  if (canTrack() && productId && value !== null) {
    (window as any).fbq('track', 'AddToCart', {
      content_ids: [productId],
      content_name: title,
      value,
      currency: 'USD',
      content_type: 'product',
      contents: [{ id: productId, quantity: safeQuantity, item_price: roundMoney(price) ?? price }],
      num_items: safeQuantity,
    });
  }
}

/**
 * Track an InitiateCheckout event
 * Call this when a user starts the checkout process
 */
export function trackInitiateCheckout(
  contentIds: string[],
  contentNames: string[],
  value: number,
  numItems: number,
  currency = 'USD'
) {
  const safeValue = roundMoney(value);
  const safeCurrency = normalizeCurrency(currency);
  if (canTrack() && contentIds.length > 0 && safeValue !== null && safeCurrency) {
    (window as any).fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      content_names: contentNames,
      value: safeValue,
      currency: safeCurrency,
      content_type: 'product',
      num_items: numItems,
    });
  }
}

/**
 * Track a Purchase event
 * Call this when a user completes a purchase with the confirmed order total.
 */
export function trackPurchase(
  contentIds: string[],
  contentNames: string[],
  value: number,
  numItems: number,
  orderId?: string,
  currency = 'USD'
) {
  const safeValue = roundMoney(value);
  const safeCurrency = normalizeCurrency(currency);
  if (canTrack() && contentIds.length > 0 && safeValue !== null && safeCurrency && numItems > 0) {
    (window as any).fbq('track', 'Purchase', {
      content_ids: contentIds,
      content_names: contentNames,
      value: safeValue,
      currency: safeCurrency,
      content_type: 'product',
      num_items: numItems,
      contents: contentIds.map((id) => ({ id, quantity: 1 })),
      ...(orderId && { order_id: orderId }),
    });
  }
}

/**
 * Track a Search event
 * Call this when a user searches for products
 */
export function trackSearch(searchString: string) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Search', {
      search_string: searchString,
    });
  }
}

/**
 * Track an AddPaymentInfo event
 * Call this when a user adds payment information
 */
export function trackAddPaymentInfo(value: number, numItems: number) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'AddPaymentInfo', {
      value,
      currency: 'USD',
      content_type: 'product',
      num_items: numItems,
    });
  }
}

/**
 * Track a Contact event
 * Call this when a user initiates contact (email, chat, etc.)
 */
export function trackContact(method = 'email') {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Contact', {
      value: 0,
      currency: 'USD',
    });
  }
}

/**
 * Track a CompleteRegistration event
 * Call this when a user completes registration/signup
 */
export function trackCompleteRegistration() {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'CompleteRegistration', {
      currency: 'USD',
    });
  }
}

/**
 * Track a Lead event
 * Call this when a user submits a form or expresses interest
 */
export function trackLead(value = 0) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Lead', {
      value,
      currency: 'USD',
    });
  }
}

/**
 * Track custom events
 */
export function trackCustomEvent(eventName: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, data || {});
  }
}
