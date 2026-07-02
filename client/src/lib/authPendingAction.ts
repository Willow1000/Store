import { supabase } from '@/lib/supabase';
import { readCartFromStorage } from '@/lib/cart';
import { saveAuthRedirect, sanitizeInternalRedirect } from '@/lib/authRedirect';

const PENDING_AUTH_ACTION_KEY = 'pending_auth_action';
const CART_AUTH_REDIRECT_PENDING_KEY = 'cart-auth-redirect-pending-v1';
const pendingAuthStorage = typeof window !== 'undefined' ? window.localStorage : null;

export type PendingAuthActionType = 'cart' | 'wishlist' | 'checkout' | 'tickets';

export interface PendingAuthAction {
  type?: PendingAuthActionType;
  productId?: string;
  quantity?: number;
  redirectTo?: string;
}

export function savePendingAuthAction(action: PendingAuthAction) {
  try {
    const redirectTo = sanitizeInternalRedirect(action.redirectTo) || undefined;
    pendingAuthStorage?.setItem(PENDING_AUTH_ACTION_KEY, JSON.stringify({ ...action, redirectTo }));
    if (redirectTo) saveAuthRedirect(redirectTo);
  } catch (error) {
    console.warn('[AuthPendingAction] Failed to save pending action', error);
  }
}

export function getPendingAuthAction(): PendingAuthAction | null {
  try {
    const raw = pendingAuthStorage?.getItem(PENDING_AUTH_ACTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingAuthAction;
  } catch (error) {
    console.warn('[AuthPendingAction] Failed to read pending action', error);
    return null;
  }
}

export function clearPendingAuthAction() {
  try {
    pendingAuthStorage?.removeItem(PENDING_AUTH_ACTION_KEY);
    pendingAuthStorage?.removeItem('oauth_return_to');
  } catch (error) {
    console.warn('[AuthPendingAction] Failed to clear pending action', error);
  }
}

function markCartAuthRedirectPending() {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(CART_AUTH_REDIRECT_PENDING_KEY, '1');
  } catch {
    // ignore storage issues
  }
}

function finishCartMigration() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem('isMigratingCart');
  } catch {
    // ignore storage issues
  }

  try {
    const w = window as any;
    if (w.__resolveCartMigration) {
      w.__resolveCartMigration();
    }
    delete w.__resolveCartMigration;
    delete w.__cartMigrationPromise;
  } catch {
    // ignore storage issues
  }

  window.dispatchEvent(new Event('cartMerged'));
}

async function ensureProfile(userId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw userError || new Error('Unable to resolve authenticated user');
  }

  const authUser = userData.user;
  const email = authUser.email || `${userId}@placeholder.local`;
  const fullName =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    null;

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (profileError) throw profileError;
}

async function upsertCartItem(userId: string, productId: string, quantity: number) {
  const nextQuantity = Math.max(1, quantity);

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, stock')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw productError;

  const availableStock = Number(productData?.stock ?? 0);
  if (availableStock <= 0) {
    throw new Error('This item is out of stock');
  }

  const { data: existingItem, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) throw existingError;

  const currentQuantity = Number(existingItem?.quantity || 0);
  if (currentQuantity + nextQuantity > availableStock) {
    throw new Error(`Only ${availableStock} item${availableStock === 1 ? '' : 's'} in stock`);
  }

  if (existingItem?.id) {
    const { error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity: (existingItem.quantity || 0) + nextQuantity })
      .eq('id', existingItem.id);
    if (updateError) throw updateError;
    return;
  }

  // Attempt atomic insert; if a concurrent request inserted it first,
  // catch the constraint violation and update instead
  const { error: insertError } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      product_id: productId,
      quantity: nextQuantity,
    });

  // If insert failed due to unique constraint, another request beat us to the insert
  // Fetch the current quantity and add our quantity to it
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: updateItem, error: refetchError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (refetchError) throw refetchError;
      if (!updateItem?.id) throw new Error('Cart item not found after concurrent insert');

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: (updateItem.quantity || 0) + nextQuantity })
        .eq('id', updateItem.id);

      if (updateError) throw updateError;
      return;
    }
    throw insertError;
  }
}

/**
 * Merge guest cart items from localStorage with authenticated user's database cart.
 * Strategy: For each product, add the guest quantity to the existing database quantity.
 * This ensures no cart items are lost when switching from guest to authenticated mode.
 * 
 * @param userId - The authenticated user's ID
 * @throws Error if merging fails or stock is insufficient
 */
// Guard to prevent concurrent merge operations
let mergeInProgress = false;

async function mergeGuestCartWithUserCart(userId: string): Promise<string[]> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('isMigratingCart', '1');
      const w = window as any;
      if (!w.__cartMigrationPromise) {
        w.__cartMigrationPromise = new Promise<void>((resolve) => {
          w.__resolveCartMigration = resolve;
        });
      }
    } catch (e) {}
  }

  // Prevent concurrent merges - if already in progress, wait for it
  if (mergeInProgress) {
    if (typeof window !== 'undefined') {
      const existingMigration = (window as any).__cartMigrationPromise;
      if (existingMigration) await existingMigration;
    }
    return [];
  }

  mergeInProgress = true;
  try {
    const localCartJson = typeof window !== 'undefined' ? localStorage.getItem('cart') : null;
    const guestCartItems = readCartFromStorage(localCartJson);

    if (guestCartItems.length === 0) {
      return [];
    }

    const mergedProductIds = guestCartItems
      .map((item) => item.productId)
      .filter((productId): productId is string => Boolean(productId));

    // Process each guest cart item
    for (const guestItem of guestCartItems) {
      if (!guestItem.productId) continue;

      try {
        // Merge strategy: add quantities
        // This ensures guest items don't overwrite but accumulate
        await upsertCartItem(userId, guestItem.productId, guestItem.quantity);
      } catch (error) {
        console.warn(
          `[CartMerge] Failed to merge item ${guestItem.productId}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Continue merging other items even if one fails
        // This prevents one out-of-stock item from blocking the entire merge
      }
    }

    // Clear localStorage cart after successful merge to prevent duplication
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
    }

    // Notify UI that cart has been updated
    window.dispatchEvent(new Event('cartUpdated'));
    return mergedProductIds;
  } finally {
    mergeInProgress = false;
    finishCartMigration();
  }
}

/**
 * Wait for any in-progress cart migration to complete.
 * Returns an already-resolved promise if no migration is in progress.
 */
export function waitForCartMigration(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as any;
  if (w.__cartMigrationPromise) return w.__cartMigrationPromise as Promise<void>;
  return Promise.resolve();
}

async function upsertWishlistItem(userId: string, productId: string) {
  const { data: existing, error: existingError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing && existing.id) return; // already exists

  const { error: insertError } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, product_id: productId });

  if (insertError) throw insertError;
}

async function mergeGuestWishlistWithUserWishlist(userId: string): Promise<void> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null;
  if (!raw) return;
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === 'string');
  } catch (e) {
    return;
  }

  if (ids.length === 0) return;

  for (const pid of ids) {
    try {
      await upsertWishlistItem(userId, pid);
    } catch (err) {
      console.warn(`[WishlistMerge] Failed to merge ${pid}:`, err instanceof Error ? err.message : err);
      // continue
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('wishlist');
    try { localStorage.removeItem('isMigratingCart'); } catch (e) {}
    window.dispatchEvent(new Event('cartMerged'));
  }

  window.dispatchEvent(new Event('wishlistUpdated'));
}

export async function executePendingAuthAction(
  userId: string,
  navigate: (to: string) => void
): Promise<boolean> {
  const action = getPendingAuthAction();
  
  try {
    // Always merge guest cart with authenticated user's cart
    await ensureProfile(userId);
    const mergedProductIds = await mergeGuestCartWithUserCart(userId);
    await mergeGuestWishlistWithUserWishlist(userId);
    
    // Handle specific pending actions
    if (action) {
      const pendingProductId = typeof action.productId === 'string' ? action.productId : null;
      const shouldAddPendingProduct =
        (action.type === 'cart' || action.type === 'checkout') &&
        pendingProductId &&
        !mergedProductIds.includes(pendingProductId);

      if (shouldAddPendingProduct && pendingProductId) {
        await upsertCartItem(userId, pendingProductId, Math.max(1, action.quantity || 1));
        window.dispatchEvent(new Event('cartUpdated'));
      }

      if (action.type === 'checkout') {
        navigate('/checkout');
      } else if (action.type === 'cart') {
        markCartAuthRedirectPending();
        navigate('/cart');
      } else if (action.redirectTo) {
        if (action.redirectTo === '/cart') {
          markCartAuthRedirectPending();
        }
        navigate(action.redirectTo);
      }

      return true;
    }

    return false;
  } finally {
    clearPendingAuthAction();
  }
}
