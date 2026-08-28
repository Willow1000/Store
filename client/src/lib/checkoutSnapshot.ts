/**
 * Checkout-related helpers for managing cart snapshots and Meta purchase tracking
 * Extracted from Checkout.tsx to improve code organization and testability
 */

export type CartItem = {
  product_id: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
};

export const CHECKOUT_CART_SNAPSHOT_KEY = "checkout-cart-snapshot-v1";
const META_PURCHASE_TRACKED_PREFIX = "meta-purchase-tracked-v1:";

/**
 * Read the checkout cart snapshot from localStorage
 * Used to restore cart state across page loads
 */
export function readCheckoutSnapshot(): CartItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CHECKOUT_CART_SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write the checkout cart snapshot to localStorage
 * Used to persist cart state across page loads
 */
export function writeCheckoutSnapshot(items: CartItem[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(CHECKOUT_CART_SNAPSHOT_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage issues and continue with in-memory checkout state
  }
}

/**
 * Check if a Meta purchase/conversion has already been tracked for this reference
 * Prevents duplicate tracking events for the same transaction
 */
export function hasTrackedMetaPurchase(reference: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    return Boolean(
      localStorage.getItem(`${META_PURCHASE_TRACKED_PREFIX}${reference}`)
    );
  } catch {
    return false;
  }
}

/**
 * Mark a Meta purchase/conversion as tracked
 * Prevents duplicate tracking events in future page loads
 */
export function markTrackedMetaPurchase(reference: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${META_PURCHASE_TRACKED_PREFIX}${reference}`,
      new Date().toISOString()
    );
  } catch {
    // Ignore persistence issues; duplicate prevention is best effort
  }
}

/**
 * Clear all checkout-related data from localStorage
 * Used after successful checkout or when resetting the flow
 */
export function clearCheckoutData(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CHECKOUT_CART_SNAPSHOT_KEY);
    localStorage.removeItem("checkout-step");
    localStorage.removeItem("checkout-form-data");
    localStorage.removeItem("cart");
  } catch {
    // Ignore deletion issues
  }
}

/**
 * Validate cart item structure
 */
export function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.product_id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.price === "string" &&
    typeof obj.image === "string" &&
    typeof obj.quantity === "number" &&
    obj.quantity > 0
  );
}

/**
 * Validate and sanitize a cart snapshot
 */
export function validateCheckoutSnapshot(items: unknown[]): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(isValidCartItem);
}
