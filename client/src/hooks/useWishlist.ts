import { useCallback, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function useWishlist() {
  const [wishedProducts, setWishedProducts] = useState<Set<number>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: wishlistData, isLoading } = trpc.wishlist.getWishlist.useQuery(undefined, {
    retry: false,
  });

  const addMutation = trpc.wishlist.addItem.useMutation({
    onSuccess: (_, variables) => {
      setWishedProducts(prev => new Set(prev).add(variables.productId));
      utils.wishlist.getWishlist.invalidate();
      toast.success('Added to wishlist');
    },
    onError: (error) => {
      if (error.data?.code === 'UNAUTHORIZED') {
        toast.error('Please sign in to add items to wishlist');
        return;
      }
      toast.error('Failed to add to wishlist');
    },
  });

  const removeMutation = trpc.wishlist.removeItem.useMutation({
    onSuccess: (_, variables) => {
      setWishedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.productId);
        return newSet;
      });
      utils.wishlist.getWishlist.invalidate();
      toast.success('Removed from wishlist');
    },
    onError: () => {
      toast.error('Failed to remove from wishlist');
    },
  });

  // Initialize wished products from data
  useEffect(() => {
    if (wishlistData) {
      const productIds = wishlistData.map(item => item.productId);
      setWishedProducts(new Set(productIds));
    }
  }, [wishlistData]);

  const toggleWishlist = useCallback((productId: number) => {
    if (wishedProducts.has(productId)) {
      removeMutation.mutate({ productId });
    } else {
      addMutation.mutate({ productId });
    }
  }, [wishedProducts, addMutation, removeMutation]);

  const addToWishlist = useCallback((productId: number) => {
    if (!wishedProducts.has(productId)) {
      addMutation.mutate({ productId });
    }
  }, [wishedProducts, addMutation]);

  const removeFromWishlist = useCallback((productId: number) => {
    if (wishedProducts.has(productId)) {
      removeMutation.mutate({ productId });
    }
  }, [wishedProducts, removeMutation]);

  return {
    wishlist: wishlistData || [],
    wishedProducts,
    isLoading,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
  };
}
