'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { useProductById } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { getHighResImageUrl } from '@/lib/images';

interface QuickViewModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ productId, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { product, images, isLoading } = useProductById(productId);
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);

  // Combine cover image with product images
  const allImages = product?.cover_image_url
    ? [
        { id: 'cover', image_url: product.cover_image_url },
        ...(images || [])
      ]
    : images || [];

  const currentImage = allImages[selectedImageIdx];
  const isWishlisted = product?.id && wishedProductIds.has(product.id);
  const stock = Number(product?.stock ?? 0);
  const isOutOfStock = stock === 0;

  const handleAddToCart = async () => {
    console.log('[QuickViewModal] AddToCart clicked', {
      isAuthenticated,
      userId: user?.id,
      productId: product?.id,
      quantity,
    });

    if (!isAuthenticated || !user?.id) {
      console.warn('[QuickViewModal] AddToCart blocked: user not authenticated');
      onClose();
      setTimeout(() =>
        openAuthModal('login', 'cart', {
          type: 'cart',
          productId: product?.id,
          quantity,
        }),
      0);
      return;
    }

    if (!product?.id) {
      console.error('[QuickViewModal] AddToCart blocked: missing product id');
      toast.error('Product information is missing');
      return;
    }

    try {
      console.log('[QuickViewModal] AddToCart sending mutation', {
        productId: product.id,
        quantity,
      });
      const added = await addToCart(product.id, quantity);
      console.log('[QuickViewModal] AddToCart mutation completed', { added });
      if (!added) {
        console.error('[QuickViewModal] AddToCart failed: hook returned false');
        toast.error('Failed to add to cart');
        return;
      }
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
      onClose();
    } catch (error) {
      console.error('[QuickViewModal] AddToCart exception', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated || !user?.id) {
      onClose();
      setTimeout(() => openAuthModal('login', 'wishlist'), 0);
      return;
    }

    if (product?.id) {
      try {
        setIsTogglingWishlist(true);
        const wasWishlisted = wishedProductIds.has(product.id);
        const updated = await toggleWishlist(product.id);
        if (!updated) {
          toast.error('Failed to toggle wishlist');
          return;
        }
        toast.success(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist!');
      } catch (error) {
        toast.error('Failed to toggle wishlist');
      } finally {
        setIsTogglingWishlist(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ) : product ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{product.title}</DialogTitle>
            </div>

            {/* Image Gallery */}
            <div className="space-y-3">
              {/* Main Image */}
              {currentImage ? (
                <img
                  src={getHighResImageUrl(currentImage.image_url)}
                  alt={product.title}
                  className="w-full h-64 object-contain rounded-lg bg-gray-100"
                  crossOrigin="anonymous"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  No image available
                </div>
              )}

              {/* Thumbnail Row */}
              {allImages.length > 1 && (
                <div className="flex gap-2">
                  {allImages.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIdx === idx ? 'border-blue-600' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={getHighResImageUrl(img.image_url)}
                        alt={`${product.title} thumbnail ${idx}`}
                        className="w-full h-full object-contain bg-gray-100"
                        crossOrigin="anonymous"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {/* Price */}
              <div>
                <p className="text-2xl font-bold text-gray-900">${parseFloat(String(product.price)).toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">Condition: {product.condition || 'Good'}</p>
                <p className={`mt-2 inline-block px-3 py-1 rounded text-xs font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isOutOfStock ? 'Out of stock' : `${stock} in stock`}
                </p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(73 reviews)</span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 line-clamp-3">{product.title}</p>

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-900">Quantity:</label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center border-0 focus:outline-none"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  type="button"
                  disabled={isOutOfStock}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={handleWishlist}
                  type="button"
                  disabled={isTogglingWishlist}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    isWishlisted
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600'
                  } ${isTogglingWishlist ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                <Link href={`/product/${product.id}`}>
                  <a
                    onClick={onClose}
                    type="button"
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-center transition-colors"
                  >
                    View Details
                  </a>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Product not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
