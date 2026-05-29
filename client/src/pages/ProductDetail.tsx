import { useRoute, useLocation } from 'wouter';
import { ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons/ProductDetailSkeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/_core/hooks/useAuth';
import { useProductById, useProducts } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useState, useEffect, useRef } from 'react';
import currencyClient from '@/lib/currencyClient';
import { getHighResImageUrl } from '@/lib/images';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, navigate] = useLocation();
  const productId = params?.id;
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { product, images, isLoading, error } = useProductById(productId || '');
  const { products: allProducts } = useProducts(1, 200); // Fetch products for similar items
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);

  // Lightweight non-blocking tracker helper (same pattern as Products.tsx)
  const sendTrackingEvent = (payload: Record<string, any>) => {
    try {
      // Ensure a persistent session id exists for anonymous users
      try {
        if (typeof window !== 'undefined') {
          let sid = localStorage.getItem('sessionId');
          if (!sid) {
            sid = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            try { localStorage.setItem('sessionId', sid); } catch (e) {}
          }
          payload.sessionId = payload.sessionId || sid;
        }
      } catch (e) {}

      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (err) {
      // ignore
    }
  };

  const hasSearchSession = () => {
    try {
      const active = sessionStorage.getItem('activeSearchTerm');
      const pending = sessionStorage.getItem('pendingSearchTerm');
      return Boolean(active || pending);
    } catch (e) {
      return false;
    }
  };

  

  // Combine cover image with product images
  const allImages: Array<{ id: string; image_url: string }> = product?.cover_image_url
    ? [
        { id: 'cover', image_url: product.cover_image_url },
        ...(images || [])
      ]
    : images || [];

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [selectedImage]);

  // Lightbox: close on Escape and navigate with arrow keys
  useEffect(() => {
    if (!showLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
      if (e.key === 'ArrowLeft') setSelectedImage((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setSelectedImage((i) => Math.min(allImages.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLightbox, allImages.length]);

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
      toast.error('This item is out of stock');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      console.warn('[ProductDetail] AddToCart blocked: user not authenticated');
      openAuthModal('login', 'cart', {
        type: 'cart',
        productId: product?.id,
        quantity,
      });
      return;
    }

    if (!product?.id) {
      console.error('[ProductDetail] AddToCart blocked: missing product id');
      toast.error('Product information is missing');
      return;
    }

    try {
      const added = await addToCart(product.id, quantity);

      if (!added) {
        console.error('[ProductDetail] AddToCart failed: hook returned false');
        return;
      }
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
      try {
        if (hasSearchSession()) {
          sendTrackingEvent({
            sessionId: typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '',
            eventType: 'product_click',
            clickedProductId: product.id,
            action: 'add_to_cart',
            pageUrl: window.location.href,
            matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
          });
        }
      } catch (e) {}
    } catch (error) {
      console.error('[ProductDetail] AddToCart exception', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      toast.error('This item is out of stock. Please contact support for more information.');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      openAuthModal('login', 'checkout', {
        type: 'checkout',
        productId: product?.id,
        quantity,
      });
      return;
    }

    try {
      if (!product?.id) {
        console.error('[ProductDetail] QuickCheckout blocked: missing product id');
        toast.error('Product information is missing');
        return;
      }
      const added = await addToCart(product.id, quantity);
      if (!added) {
        return;
      }
        try {
          if (hasSearchSession()) {
            sendTrackingEvent({
              sessionId: typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '',
              eventType: 'product_click',
              clickedProductId: product.id,
              action: 'buy_now',
              pageUrl: window.location.href,
              matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
            });
          }
        } catch (e) {}
      navigate('/checkout');
    } catch (error) {
      console.error('[ProductDetail] QuickCheckout exception', error);
      toast.error('Failed to proceed to checkout');
    }
  };

  const handleWishlistClick = async () => {
    if (!isAuthenticated || !user?.id) {
      openAuthModal('login', 'wishlist');
      return;
    }
    
    if (product?.id) {
      try {
        await toggleWishlist(product.id);
      } catch (error) {
        console.error('Failed to toggle wishlist:', error);
      }
    }
  };

  // Track recently viewed items in localStorage
  useEffect(() => {
    if (product?.id) {
      try {
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        // Remove duplicate if it exists and add to front
        const filtered = recentlyViewed.filter((id: string) => id !== product.id);
        const updated = [product.id, ...filtered].slice(0, 10); // Keep max 10 items
        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update recently viewed:', error);
      }
    }
  }, [product?.id]);

  // Smooth handling when product lookup returns no result
  useEffect(() => {
    if (!isLoading && productId && !product) {
      toast.error('Product not found. Redirecting to products.');
      setTimeout(() => navigate('/products'), 1400);
    }
  }, [isLoading, productId, product, navigate]);

  if (!productId) return null;

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }


  if (!product) return null;

  const currentPrice = Number(product.price);
  const originalPrice = product.original_price ? Number(product.original_price) : null;

  // Use centralized currency client (initialized at app bootstrap)
  // Always show USD for African users (enforced in currencyClient)
  const currencyCode = currencyClient.getCurrencyCode();
  const currencyRate = currencyClient.getCurrencyRate();
  // Use USD for African users, else use detected currency
  const formatPrice = (n: number) => {
    if (currencyClient.isAfricanUser()) {
      return currencyClient.formatUSD(n);
    }
    const rate = currencyClient.getCurrencyRate() || 1;
    const symbol = currencyClient.getCurrencySymbolLocal();
    return `${symbol}${(n * rate).toFixed(2)}`;
  };
  
  // Calculate accurate discount percentage: (discount - price) / discount * 100
  let discountPercentage = 0;
  let discountAmount = 0;
  
  if (product.discount && Number(product.discount) > currentPrice) {
    const discountValue = Number(product.discount);
    discountAmount = discountValue - currentPrice;
    discountPercentage = Math.round(((discountValue - currentPrice) / discountValue) * 100);
  }
  
  const stock = Number(product.stock ?? 0);
  const isOutOfStock = stock === 0;
  const isWishlisted = product.id && wishedProductIds.has(product.id);

  const productDescription =
    typeof product.item_specifics === 'string'
      ? product.item_specifics.trim()
      : product.item_specifics && typeof product.item_specifics === 'object'
        ? JSON.stringify(product.item_specifics, null, 2)
        : '';

  const getEnquiryContactUrl = (outOfStockOnly: boolean = false) => {
    const params = new URLSearchParams();
    const subjectPrefix = outOfStockOnly ? 'Out of Stock Inquiry' : 'Product Enquiry';
    const subject = `${subjectPrefix} - ${product.title}`;

    const lines = [
      'Hello Support,',
      '',
      outOfStockOnly
        ? `I am interested in the product "${product.title}" which is currently out of stock.`
        : `I would like to enquire about this product: "${product.title}".`,
      '',
      `Product: ${product.title}`,
      product.part_number ? `Part Number: ${product.part_number}` : '',
      product.brand ? `Brand: ${product.brand}` : '',
      product.model ? `Model: ${product.model}` : '',
      product.category_name ? `Category: ${product.category_name}` : '',
      Number.isFinite(Number(product.price)) ? `Price: ${Number(product.price).toFixed(2)}` : '',
      `Product Link: ${window.location.origin}/product/${product.id}`,
      '',
      outOfStockOnly
        ? 'Please let me know when this item becomes available again.'
        : 'Please share availability, compatibility details, and next steps to order.',
    ].filter(Boolean);

    params.set('subject', subject);
    params.set('message', lines.join('\n'));
    params.set('product', product.title);
    params.set('productId', String(product.id));

    if (typeof user?.name === 'string' && user.name.trim()) {
      params.set('name', user.name.trim());
    }
    if (typeof user?.email === 'string' && user.email.trim()) {
      params.set('email', user.email.trim());
    }

    const userLocation =
      typeof (user as any)?.location === 'string'
        ? (user as any).location
        : typeof (user as any)?.country === 'string'
          ? (user as any).country
          : '';

    if (userLocation.trim()) {
      params.set('location', userLocation.trim().toLowerCase());
    }

    return `/contact?${params.toString()}`;
  };

  const handleEnquireItem = () => {
    try {
      if (hasSearchSession()) {
        sendTrackingEvent({
          sessionId: typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '',
          eventType: 'product_click',
          clickedProductId: product?.id,
          action: 'enquire',
          pageUrl: window.location.href,
          matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
        });
      }
    } catch (e) {}
    navigate(getEnquiryContactUrl(false));
  };

  // Get similar products from the same category (max 6)
  const similarProducts = allProducts
    .filter(
      (p) =>
        p.id !== product?.id &&
        p.category_name === product?.category_name
    )
    .slice(0, 6);

  return (
    <main role="main" className="bg-white min-h-screen w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        {/* Product Detail Grid */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-20 xl:gap-x-24 lg:items-start">
          {/* LEFT COLUMN - Image Gallery */}
          <div className="flex flex-row sm:flex-col-reverse gap-3 sm:gap-0">
            {/* Thumbnail Gallery - Vertical on mobile, below on sm+ */}
            {allImages && allImages.length > 1 && (
              <div className="w-auto sm:w-full sm:mt-6 max-w-2xl sm:mx-auto lg:max-w-none">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-auto sm:w-full overflow-y-auto sm:overflow-x-auto pb-2 sm:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <style>{`
                    div::-webkit-scrollbar { display: none; }
                  `}</style>
                  {(() => {
                    const windowSize = 6; // always show up to 6 thumbnails on both mobile and desktop
                    const startIdx = Math.max(0, Math.min(selectedImage, allImages.length - windowSize));
                    const imagesToShow = allImages.slice(startIdx, startIdx + windowSize);

                    return imagesToShow.map((img, idx) => {
                      const actualImageIndex = startIdx + idx;
                      return (
                        <button
                          key={img.id || idx}
                          onClick={() => setSelectedImage(actualImageIndex)}
                          className={`relative h-16 sm:h-24 w-16 sm:w-20 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-all flex-shrink-0 aspect-square ${
                            selectedImage === actualImageIndex ? 'ring-2 ring-blue-500 bg-white' : 'bg-white border'
                          }`}
                        >
                          <span className="absolute inset-0 rounded-md overflow-hidden">
                            <img
                              src={getHighResImageUrl(img.image_url)}
                              alt={`Product image ${actualImageIndex + 1}`}
                              className="w-full h-full object-center object-contain bg-white"
                              style={{ imageRendering: 'high-quality' }}
                              loading="lazy"
                              crossOrigin="anonymous"
                            />
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Main Image */}
            <div className="flex-1 sm:w-full">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border relative" ref={imageContainerRef}>
                {allImages && allImages.length > 0 && allImages[selectedImage] ? (
                  <>
                    <div 
                      className="relative min-h-[400px] flex items-center justify-center overflow-hidden"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onClick={() => {
                        if (!isDraggingRef.current) setShowLightbox(true);
                      }}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    >
                      <img
                        key={`main-${selectedImage}`}
                        src={getHighResImageUrl(allImages[selectedImage].image_url)}
                        alt={`${product.title}`}
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-center object-contain p-4 transition-none select-none pointer-events-none will-change-transform"
                        style={{ 
                          imageRendering: 'high-quality',
                          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                          transformOrigin: 'center center',
                          backfaceVisibility: 'hidden'
                        }}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f5f5f5" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    
                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-2 bg-white/75 sm:bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                      <button
                        onClick={() => setZoom(Math.max(zoom - 0.2, 1))}
                        disabled={zoom <= 1}
                        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zoom out"
                        title="Zoom out"
                      >
                        <ZoomOut size={20} className="text-gray-700" />
                      </button>
                      <div className="flex items-center px-2 text-sm text-gray-700 font-medium">
                        {Math.round(zoom * 100)}%
                      </div>
                      <button
                        onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                        disabled={zoom >= 3}
                        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zoom in"
                        title="Zoom in"
                      >
                        <ZoomIn size={20} className="text-gray-700" />
                      </button>
                    </div>
                    
                    {selectedImage > 0 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={24} className="text-gray-700" />
                      </button>
                    )}
                    {selectedImage < allImages.length - 1 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight size={24} className="text-gray-700" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-400">No image available</div>
                )}
              </div>
            </div>
          </div>

          {/* Lightbox Modal */}
          {showLightbox && allImages && allImages.length > 0 && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4" onClick={() => setShowLightbox(false)}>
              <button className="absolute top-6 right-6 text-white p-2 rounded-md bg-black/30 hover:bg-black/50" onClick={() => setShowLightbox(false)} aria-label="Close">
                ×
              </button>

              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/30 hover:bg-black/50"
                onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => Math.max(0, i - 1)); }}
                aria-label="Previous"
              >
                ‹
              </button>

              <div className="max-w-[95vw] max-h-[95vh] flex items-center justify-center">
                <img
                  src={getHighResImageUrl(allImages[selectedImage].image_url)}
                  alt={product?.title}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/30 hover:bg-black/50"
                onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => Math.min(allImages.length - 1, i + 1)); }}
                aria-label="Next"
              >
                ›
              </button>
            </div>
          )}

          {/* RIGHT COLUMN - Product Info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            {/* Title */}
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>

            {/* Price */}
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <p className="text-3xl text-gray-900 font-bold">
                    {formatPrice(currentPrice)}
                  </p>
                {product.discount && Number(product.discount) > currentPrice && (
                  <p className="text-2xl text-gray-500 line-through">
                    {formatPrice(Number(product.discount))}
                  </p>
                )}
              </div>
              {discountPercentage > 0 && (
                <div className="mt-2 inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                  Save {discountPercentage}% - {discountAmount.toFixed(2)}
                </div>
              )}
              <div className={`mt-2 inline-block px-3 py-1 rounded text-sm font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isOutOfStock ? 'Out of stock' : `${stock} in stock`}
              </div>
              <span className="text-sm font-normal text-gray-500 block mt-2">
                {discountPercentage > 0 ? `(You save ${discountAmount.toFixed(2)})` : '(Estimated Price)'}
              </span>
            </div>

            {/* Description */}
            <div className="mt-6">
              <p className="text-base text-gray-700">
                {product.title || 'Premium quality product with excellent craftsmanship and attention to detail.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 space-y-3">
              {/* Quick Purchase Button */}
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`w-full border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isOutOfStock
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {isOutOfStock ? 'Out of Stock' : 'Quick Purchase'}
              </button>

              {/* Add to Cart & Wishlist Row */}
              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    isOutOfStock
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleWishlistClick}
                  className="bg-white border border-gray-300 rounded-md py-3 px-4 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Heart className="h-6 w-6" fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="flex space-x-4">
                {/* Continue Shopping Button (flex-1) */}
                <button
                  onClick={() => navigate('/products')}
                  className="flex-1 border border-gray-300 rounded-md py-3 px-6 flex items-center justify-center text-base font-medium text-gray-700 bg-white hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition-all duration-200"
                >
                  ← Continue Shopping
                </button>

                {/* Enquire About Item (compact, beside continue) */}
                <button
                  onClick={handleEnquireItem}
                  className="w-40 flex-shrink-0 border border-blue-200 rounded-md py-3 px-4 flex items-center justify-center text-base font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Enquire
                </button>
              </div>

              {/* Out of Stock Message */}
              {isOutOfStock && (
                <div className="mt-8 bg-red-50 border-l-4 border-red-600 p-4 rounded">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        This item is currently out of stock. Please <a href={getEnquiryContactUrl(true)} className="underline hover:text-red-900 font-bold">contact support</a> for availability information.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Details Section - Below Image */}
        <div className="mt-12 border-t border-gray-200 pt-12">
          {/* Key Specifications */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Specifications</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.condition && (
                <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                  <span className="block text-xs text-gray-500 uppercase">Condition</span>
                  <span className="block text-sm font-bold capitalize">{product.condition}</span>
                </div>
              )}
              {product.category_name && (
                <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                  <span className="block text-xs text-gray-500 uppercase">Category</span>
                  <span className="block text-sm font-bold">{product.category_name}</span>
                </div>
              )}
              {product.brand && (
                <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                  <span className="block text-xs text-gray-500 uppercase mb-2">Brand</span>
                  {product.brand_details?.image_url ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200">
                        <img 
                          src={product.brand_details.image_url} 
                          alt={product.brand}
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold">{product.brand}</span>
                    </div>
                  ) : (
                    <span className="block text-sm font-bold">{product.brand}</span>
                  )}
                </div>
              )}
              {product.model && (
                <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                  <span className="block text-xs text-gray-500 uppercase">Model</span>
                  <span className="block text-sm font-bold">{product.model}</span>
                </div>
              )}
              {product.part_number && (
                <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                  <span className="block text-xs text-gray-500 uppercase">Part Number</span>
                  <span className="block text-sm font-bold font-mono">{product.part_number}</span>
                </div>
              )}
              <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                <span className="block text-xs text-gray-500 uppercase">Stock Status</span>
                <span className={`block text-sm font-bold ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
                  {isOutOfStock ? 'Out of stock' : 'In Stock'}
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  {isOutOfStock ? '0 available' : `${stock} available`}
                </span>
              </div>
              <div className="bg-white px-4 py-3 border rounded-md shadow-sm">
                <span className="block text-xs text-gray-500 uppercase">Availability</span>
                <span className="block text-sm font-bold">{isOutOfStock ? 'Unavailable' : 'Ready to Ship'}</span>
              </div>
            </div>
          </div>

          {/* Product Information Section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Information</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {product.price && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Current Price:</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      {formatPrice(currentPrice)}
                    </dd>
                  </div>
                )}
                {product.discount && Number(product.discount) > currentPrice && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Original Price:</dt>
                    <dd className="text-sm font-semibold text-gray-500 line-through">
                      {formatPrice(Number(product.discount))}
                    </dd>
                  </div>
                )}
                {discountPercentage > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Discount:</dt>
                    <dd className="text-sm font-semibold text-green-600">
                      {discountPercentage}% ({discountAmount.toFixed(2)})
                    </dd>
                  </div>
                )}
                {product.stock !== null && product.stock !== undefined && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Units Available:</dt>
                    <dd className="text-sm font-semibold text-gray-900">{product.stock}</dd>
                  </div>
                )}
                {product.created_at && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Listed on:</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      {new Date(product.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Product Description */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Description</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              {productDescription ? (
                <p className="whitespace-pre-line text-base leading-7 text-gray-700">
                  {productDescription}
                </p>
              ) : (
                <p className="text-base text-gray-500">No product description available.</p>
              )}
            </div>
          </div>

          {/* Out of Stock Alert Section */}
        </div>

        {/* Similar Items Section */}
        {similarProducts.length > 0 && (
          <section className="mt-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">Similar Items</h2>
              <Link href={`/products?category=${product?.category_name || ''}`}>
                <a className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                  See all <span aria-hidden="true"> →</span>
                </a>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
              {similarProducts.map((p) => {
                const isWished = p.id && wishedProductIds.has(p.id);
                return (
                  <Link key={p.id} href={`/product/${p.id}`}>
                    <a
                      onClick={() => {
                        try {
                          if (hasSearchSession()) {
                            sendTrackingEvent({
                              sessionId: typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '',
                              eventType: 'product_click',
                              clickedProductId: p.id,
                              action: 'similar_click',
                              pageUrl: window.location.href,
                              matchedProductIds: (allProducts || []).slice(0, 50).map(pp => pp.id),
                            });
                          }
                        } catch (e) {}
                      }}
                      className="group relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="w-full bg-gray-200 group-hover:opacity-75 h-48">
                        <img
                          src={getHighResImageUrl(p.cover_image_url || '')}
                          alt={p.title}
                          className="w-full h-full object-center object-contain p-4"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          <span aria-hidden="true" className="absolute inset-0"></span>
                          {p.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 capitalize">{p.condition || 'New'}</p>
                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {currencyClient.formatUSD(parseFloat(String(p.price || 0)))}
                        </p>
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
