import { useCallback, useState } from "react";
import { useSupabaseCart } from "@/hooks/useSupabaseCart";
import { trackAddToCart } from "@/hooks/useMetaPixel";

type QuickAddProduct = {
  id: string;
  title: string | null;
  price: number | string | null;
};

/**
 * One-tap "Add to cart" for product cards. Thin wrapper over the existing
 * cart hook (which already handles guests, stock checks and the success/error
 * toast) plus the same pixel event the product page fires - no cart logic
 * lives here. Call it once per page and hand `addProduct` to the cards.
 */
export function useQuickAdd(userId: string | null) {
  const { addToCart } = useSupabaseCart(userId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const addProduct = useCallback(
    async (product: QuickAddProduct) => {
      if (!product?.id) return false;
      setPendingId(product.id);
      try {
        const added = await addToCart(product.id, 1);
        if (added) {
          trackAddToCart(
            product.id,
            product.title || "",
            Number(product.price) || 0,
            1
          );
        }
        return Boolean(added);
      } finally {
        setPendingId(current => (current === product.id ? null : current));
      }
    },
    [addToCart]
  );

  return { addProduct, pendingId };
}
