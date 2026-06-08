import { supabase } from '@/lib/supabase';
import { readCartFromStorage } from '@/lib/cart';

const PENDING_AUTH_ACTION_KEY = 'pending_auth_action';
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
    pendingAuthStorage?.setItem(PENDING_AUTH_ACTION_KEY, JSON.stringify(action));
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
  } catch (error) {
    console.warn('[AuthPendingAction] Failed to clear pending action', error);
  }
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

  const { error: insertError } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      product_id: productId,
      quantity: nextQuantity,
    });

  if (insertError) throw insertError;
}

/**
 * Merge guest cart items from localStorage with authenticated user's database cart.
 * Strategy: For each product, add the guest quantity to the existing database quantity.
 * This ensures no cart items are lost when switching from guest to authenticated mode.
 * 
 * @param userId - The authenticated user's ID
 * @throws Error if merging fails or stock is insufficient
 */
async function mergeGuestCartWithUserCart(userId: string): Promise<void> {
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

  const localCartJson = typeof window !== 'undefined' ? localStorage.getItem('cart') : null;
  const guestCartItems = readCartFromStorage(localCartJson);
  
  if (guestCartItems.length === 0) {
    // No guest cart items to merge
    return;
  }

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
    try { localStorage.removeItem('isMigratingCart'); } catch (e) {}
    try {
      const w = window as any;
      if (w.__resolveCartMigration) {
        try { w.__resolveCartMigration(); } catch (e) {}
        try { delete w.__resolveCartMigration; } catch (e) {}
        try { delete w.__cartMigrationPromise; } catch (e) {}
      }
    } catch (e) {}
    window.dispatchEvent(new Event('cartMerged'));
  }

  // Notify UI that cart has been updated
  window.dispatchEvent(new Event('cartUpdated'));
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
    await mergeGuestCartWithUserCart(userId);
    await mergeGuestWishlistWithUserWishlist(userId);
    
    // Handle specific pending actions
    if (action) {
      if ((action.type === 'cart' || action.type === 'checkout') && action.productId) {
        // Add the specific product if it's different from merge
        await upsertCartItem(userId, action.productId, Math.max(1, action.quantity || 1));
        window.dispatchEvent(new Event('cartUpdated'));
      }

      if (action.type === 'checkout') {
        navigate('/checkout');
      } else if (action.redirectTo) {
        navigate(action.redirectTo);
      }

      return true;
    }

    return false;
  } finally {
    clearPendingAuthAction();
  }
}
