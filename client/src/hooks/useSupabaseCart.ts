import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CartItem, WishlistItem, Product } from '@/types/supabase';
import { toast } from 'sonner';

export function useSupabaseCart(userId: string | null) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureProfile = useCallback(async () => {
    if (!userId) return false;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('Unable to resolve authenticated user for profile sync:', userError);
      return false;
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

    if (profileError) {
      console.error('Failed to ensure profile exists:', profileError);
      return false;
    }

    return true;
  }, [userId]);

  // Fetch cart items
  const fetchCart = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const profileReady = await ensureProfile();
      if (!profileReady) {
        setItems([]);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', userId);

      if (supabaseError) throw supabaseError;

      const cartData = data as CartItem[];
      setItems(cartData);

      // Keep local cart snapshot in sync for header/cart badge consumers.
      const localCart = cartData.map((item) => ({
        productId: item.product_id,
        productIndex: Number.NaN,
        title: item.product?.title || 'Product',
        price: String(item.product?.price ?? 0),
        image: item.product?.cover_image_url || '',
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));
      localStorage.setItem('cart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch cart';
      setError(message);
      console.error('Error fetching cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, ensureProfile]);

  // Add to cart
  const addToCart = useCallback(
    async (productId: string, quantity: number = 1) => {
      if (!userId) {
        toast.error('Please sign in to add items to cart');
        return false;
      }

      try {
        const profileReady = await ensureProfile();
        if (!profileReady) {
          toast.error('Unable to create your profile. Please try again.');
          return false;
        }

        const nextQuantity = Math.max(1, quantity);

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, stock, title')
          .eq('id', productId)
          .maybeSingle();

        if (productError) throw productError;

        const availableStock = Number(productData?.stock ?? 0);
        if (availableStock <= 0) {
          toast.error('This item is out of stock');
          return false;
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
          toast.error(`Only ${availableStock} item${availableStock === 1 ? '' : 's'} in stock`);
          return false;
        }

        if (existingItem?.id) {
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: (existingItem.quantity || 0) + nextQuantity })
            .eq('id', existingItem.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: userId,
              product_id: productId,
              quantity: nextQuantity,
            });
          if (insertError) throw insertError;
        }

        toast.success('Added to cart');
        await fetchCart();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add to cart';
        toast.error(message);
        console.error('Error adding to cart:', err);
        return false;
      }
    },
    [userId, fetchCart, ensureProfile]
  );

  // Update quantity
  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        if (quantity <= 0) {
          await removeFromCart(cartItemId);
          return true;
        }

        const { error: supabaseError } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', cartItemId);

        if (supabaseError) throw supabaseError;

        toast.success('Cart updated');
        await fetchCart();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update quantity';
        toast.error(message);
        console.error('Error updating quantity:', err);
        return false;
      }
    },
    [fetchCart]
  );

  // Remove from cart
  const removeFromCart = useCallback(
    async (cartItemId: string) => {
      try {
        const { error: supabaseError } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', cartItemId);

        if (supabaseError) throw supabaseError;

        toast.success('Removed from cart');
        await fetchCart();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove from cart';
        toast.error(message);
        console.error('Error removing from cart:', err);
        return false;
      }
    },
    [fetchCart]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!userId) return false;

    try {
      const { error: supabaseError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (supabaseError) throw supabaseError;

      toast.success('Cart cleared');
      await fetchCart();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cart';
      toast.error(message);
      console.error('Error clearing cart:', err);
      return false;
    }
  }, [userId, fetchCart]);

  // Auto-fetch on userId change
  useEffect(() => {
    fetchCart();
  }, [userId, fetchCart]);

  return {
    items,
    isLoading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refetch: fetchCart,
  };
}

export function useSupabaseWishlist(userId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [wishedProductIds, setWishedProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wishlist
  const fetchWishlist = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setWishedProductIds(new Set());
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('wishlists')
        .select('*, product:products(*)')
        .eq('user_id', userId);

      if (supabaseError) throw supabaseError;

      setItems(data as WishlistItem[]);
      setWishedProductIds(new Set(data.map(item => item.product_id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wishlist';
      setError(message);
      console.error('Error fetching wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Add to wishlist
  const addToWishlist = useCallback(
    async (productId: string) => {
      if (!userId) {
        toast.error('Please sign in to save items');
        return false;
      }

      try {
        const { error: supabaseError } = await supabase
          .from('wishlists')
          .insert({
            user_id: userId,
            product_id: productId,
          });

        if (supabaseError) throw supabaseError;

        toast.success('Added to wishlist');
        await fetchWishlist();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add to wishlist';
        toast.error(message);
        console.error('Error adding to wishlist:', err);
        return false;
      }
    },
    [userId, fetchWishlist]
  );

  // Remove from wishlist
  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (!userId) return false;

      try {
        const { error: supabaseError } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', productId);

        if (supabaseError) throw supabaseError;

        toast.success('Removed from wishlist');
        await fetchWishlist();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove from wishlist';
        toast.error(message);
        console.error('Error removing from wishlist:', err);
        return false;
      }
    },
    [userId, fetchWishlist]
  );

  // Toggle wishlist
  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (wishedProductIds.has(productId)) {
        return removeFromWishlist(productId);
      } else {
        return addToWishlist(productId);
      }
    },
    [wishedProductIds, addToWishlist, removeFromWishlist]
  );

  // Auto-fetch on userId change
  useEffect(() => {
    fetchWishlist();
  }, [userId, fetchWishlist]);

  return {
    items,
    wishedProductIds,
    isLoading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    refetch: fetchWishlist,
  };
}
