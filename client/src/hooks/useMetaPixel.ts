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

/**
 * Track a ViewContent event
 * Call this when a user views a product page
 */
export function trackViewContent(productId: string, title: string, price: number) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'ViewContent', {
      content_id: productId,
      content_name: title,
      value: price,
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
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'AddToCart', {
      content_id: productId,
      content_name: title,
      value: price * quantity,
      currency: 'USD',
      content_type: 'product',
      quantity,
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
  numItems: number
) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      content_names: contentNames,
      value,
      currency: 'USD',
      content_type: 'product',
      num_items: numItems,
    });
  }
}

/**
 * Track a Purchase event
 * Call this when a user completes a purchase
 */
export function trackPurchase(
  contentIds: string[],
  contentNames: string[],
  value: number,
  numItems: number,
  orderId?: string
) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Purchase', {
      content_ids: contentIds,
      content_names: contentNames,
      value,
      currency: 'USD',
      content_type: 'product',
      num_items: numItems,
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
