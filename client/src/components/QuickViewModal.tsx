'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Heart, ShoppingCart, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import currencyClient from '@/lib/currencyClient';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { useProductById } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuth } from '@/_core/hooks/useAuth';
import { getHighResImageUrl } from '@/lib/images';
import { trackAddToCart } from '@/hooks/useMetaPixel';
import { buildContactHref, getEnquiryCopy } from '@/lib/enquiry';
import { getSiteLanguage } from '@/lib/language';

interface QuickViewModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ productId, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { user, isAuthenticated } = useAuth();
  const { product, images, isLoading } = useProductById(productId);
  // Use centralized currency client for symbol, code and rate
  const currencyCode = currencyClient.getCurrencyCode();
  const currencyRate = currencyClient.getCurrencyRate();
  const currencySymbol = currencyClient.getCurrencySymbolLocal();
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
  const enquiryCopy = getEnquiryCopy(getSiteLanguage());
  const outOfStockParams = new URLSearchParams({
    subject: `${enquiryCopy.quickViewOutOfStockSubject} - ${product?.title || ''}`,
    message: enquiryCopy.quickViewOutOfStockMessage(product?.title || ''),
  });
  const outOfStockContactHref = buildContactHref(outOfStockParams);

  const normalizeSpecificKey = (key: string) => key.toLowerCase().replace(/[_\s-]/g, '');
  const formatSpecificLabel = (key: string) =>
    key
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const baseSpecifics: Array<[string, string]> = [
    ['Brand', String(product?.brand_details?.name || product?.brand || '')],
    ['Model', String(product?.model || '')],
    ['Condition', String(product?.condition || '')],
    ['Part Number', String(product?.part_number || '')],
    ['Category', String(product?.category_name || '')],
  ].filter((entry): entry is [string, string] => Boolean(entry[1] && entry[1].trim() !== ''));

  const existingSpecificKeys = new Set(baseSpecifics.map(([key]) => normalizeSpecificKey(key)));
  const rawItemSpecifics =
    product?.item_specifics && typeof product.item_specifics === 'object'
      ? Object.entries(product.item_specifics)
      : [];

  const additionalSpecifics: Array<[string, string]> = rawItemSpecifics
    .filter(([key, value]) => {
      const normalized = normalizeSpecificKey(key);
      if (existingSpecificKeys.has(normalized)) return false;
      if (value === null || value === undefined) return false;
      const stringValue = String(value).trim();
      return stringValue !== '';
    })
    .map(([key, value]) => [formatSpecificLabel(key), String(value).trim()]);

  const itemSpecificsPreview: Array<[string, string]> = [...baseSpecifics, ...additionalSpecifics].slice(0, 3);

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [selectedImageIdx]);

  // Handle drag for panning on mouse and touch devices
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    const nextDragStart = { x: e.clientX - panX, y: e.clientY - panY };
    dragStartRef.current = nextDragStart;
    setIsDragging(true);
    setDragStart(nextDragStart);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    requestAnimationFrame(() => {
      setPanX(e.clientX - dragStartRef.current.x);
      setPanY(e.clientY - dragStartRef.current.y);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const nextDragStart = { x: touch.clientX - panX, y: touch.clientY - panY };
    dragStartRef.current = nextDragStart;
    setIsDragging(true);
    setDragStart(nextDragStart);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch || !isDraggingRef.current) return;
    e.preventDefault();
    requestAnimationFrame(() => {
      setPanX(touch.clientX - dragStartRef.current.x);
      setPanY(touch.clientY - dragStartRef.current.y);
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  // Handle scroll zoom
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const newZoom = Math.min(Math.max(zoom - e.deltaY * 0.001 * zoomSpeed, 1), 3);
        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error('This item is out of stock. Please contact support for more information.');
      return;
    }

    // Allow guests to add to cart via hook (hook handles localStorage when no user)

    if (!product?.id) {
      console.error('[QuickViewModal] AddToCart blocked: missing product id');
      toast.error('Product information is missing');
      return;
    }

    try {
      const added = await addToCart(product.id, quantity);
      if (!added) {
        toast.error('Failed to add to cart');
        return;
      }
      trackAddToCart(product.id, product.title, Number(product.price) || 0, quantity);
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
      onClose();
    } catch (error) {
      console.error('[QuickViewModal] AddToCart exception', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async () => {
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
              <div className="relative" ref={imageContainerRef}>
                {currentImage ? (
                  <>
                    <div 
                      className="relative w-full h-64 flex items-center justify-center overflow-hidden bg-gray-100 rounded-lg"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    >
                      <img
                        src={getHighResImageUrl(currentImage.image_url)}
                        alt={product.title}
                        className="w-full h-full object-contain select-none pointer-events-none will-change-transform"
                        style={{
                          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                          transformOrigin: 'center center'
                        }}
                        fetchPriority="high"
                        crossOrigin="anonymous"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                    
                    {/* Zoom Controls */}
                    <div className="absolute bottom-2 right-2 flex gap-1 bg-white/75 sm:bg-white/90 backdrop-blur-sm p-1 rounded shadow">
                      <button
                        onClick={() => setZoom(Math.max(zoom - 0.2, 1))}
                        disabled={zoom <= 1}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zoom out"
                        title="Zoom out"
                      >
                        <ZoomOut size={16} className="text-gray-700" />
                      </button>
                      <div className="flex items-center px-1.5 text-xs text-gray-700 font-medium min-w-10 justify-center">
                        {Math.round(zoom * 100)}%
                      </div>
                      <button
                        onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                        disabled={zoom >= 3}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zoom in"
                        title="Zoom in"
                      >
                        <ZoomIn size={16} className="text-gray-700" />
                      </button>
                    </div>
                    {selectedImageIdx > 0 && (
                      <button
                        onClick={() => setSelectedImageIdx(selectedImageIdx - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={20} className="text-gray-700" />
                      </button>
                    )}
                    {selectedImageIdx < allImages.length - 1 && (
                      <button
                        onClick={() => setSelectedImageIdx(selectedImageIdx + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight size={20} className="text-gray-700" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    No image available
                  </div>
                )}
              </div>

              {/* Thumbnail Row */}
              {allImages.length > 1 && (
                <div className="flex flex-col sm:flex-row gap-2 overflow-y-auto sm:overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <style>{`
                    div::-webkit-scrollbar { display: none; }
                  `}</style>
                  {(() => {
                    const isMobile = window.innerWidth < 640; // sm breakpoint
                    const windowSize = isMobile ? 4 : 6; // 4 on mobile, 6 on desktop
                    const startIdx = Math.max(0, Math.min(selectedImageIdx, allImages.length - windowSize));
                    const imagesToShow = allImages.slice(startIdx, startIdx + windowSize);
                    
                    return imagesToShow.map((img, idx) => {
                      const actualImageIndex = startIdx + idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIdx(actualImageIndex)}
                          className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 aspect-square ${
                            selectedImageIdx === actualImageIndex ? 'border-blue-600' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={getHighResImageUrl(img.image_url)}
                            alt={`${product.title} thumbnail ${actualImageIndex}`}
                            className="w-full h-full object-contain bg-gray-100"
                            style={{}}
                            crossOrigin="anonymous"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {/* Price */}
              <div>
                {/* Use currency symbol and conversion, hide USD, show discount as plain number */}
                <p className="text-2xl font-bold text-gray-900">
                  {currencyClient.isAfricanUser()
                    ? currencyClient.formatUSD(parseFloat(String(product.price)))
                    : `${currencySymbol}${(parseFloat(String(product.price)) * currencyRate).toFixed(2)}`}
                </p>
                {product.discount && (
                  <p className="text-sm text-gray-500 line-through">
                  {currencyClient.isAfricanUser()
                    ? currencyClient.formatUSD(parseFloat(String(product.discount)))
                    : `${currencySymbol}${(parseFloat(String(product.discount)) * currencyRate).toFixed(2)}`
                  }
                </p>
                )}
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

              {itemSpecificsPreview.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50/60">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Item Specifics</p>
                  <div className="space-y-1.5">
                    {itemSpecificsPreview.map(([label, value]) => (
                      <div key={`${label}-${value}`} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">{label}</span>
                        <span className="text-xs font-medium text-gray-900 text-right truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={`/product/${product.id}`} className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800 underline" onClick={onClose}>
                    View full item specifics
                  </Link>
                </div>
              )}

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

              {/* Out of Stock Alert */}
              {isOutOfStock && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-semibold text-sm mb-2">This item is currently out of stock</p>
                  <p className="text-red-600 text-sm mb-3">
                    Please <a href={outOfStockContactHref} className="underline hover:text-red-700 font-medium">contact support</a> for information about when this item will be back in stock.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 bg-gray-400 text-white py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Out of Stock
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    type="button"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                )}
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
                <Link href={`/product/${product.id}`} className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-center transition-colors" onClick={onClose}>
                  View Details
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
