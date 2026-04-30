import { supabase } from '@/lib/supabase';

const PENDING_AUTH_ACTION_KEY = 'pending_auth_action';
const pendingAuthStorage = typeof window !== 'undefined' ? window.localStorage : null;

export type PendingAuthActionType = 'cart' | 'wishlist' | 'checkout';

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

  const { data: existingItem, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) throw existingError;

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

export async function executePendingAuthAction(
  userId: string,
  navigate: (to: string) => void
): Promise<boolean> {
  const action = getPendingAuthAction();
  if (!action) return false;

  try {
    if ((action.type === 'cart' || action.type === 'checkout') && action.productId) {
      await ensureProfile(userId);
      await upsertCartItem(userId, action.productId, Math.max(1, action.quantity || 1));
      window.dispatchEvent(new Event('cartUpdated'));
    }

    if (action.type === 'checkout') {
      navigate('/checkout');
    } else if (action.redirectTo) {
      navigate(action.redirectTo);
    }

    return true;
  } finally {
    clearPendingAuthAction();
  }
}
