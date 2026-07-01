import { useRoute, useLocation } from 'wouter';
import { ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons/ProductDetailSkeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/_core/hooks/useAuth';
import { useProductById, useProducts } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useIsMobile } from '@/hooks/useMobile';
import currencyClient from '@/lib/currencyClient';
import { getHighResImageUrl } from '@/lib/images';
import { trackAddToCart, trackViewContent } from '@/hooks/useMetaPixel';
import { ProductRecommendationSection } from '@/components/ProductRecommendationSection';
import { useRecommendations } from '@/hooks/useRecommendations';
import { buildContactHref, getEnquiryCopy } from '@/lib/enquiry';
import { getSiteLanguage } from '@/lib/language';

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
  const isMobile = useIsMobile();
  const { product, images, isLoading, error } = useProductById(productId || '');
  const { products: allProducts } = useProducts(1, 200); // Fetch products for similar items
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  const recommendations = useRecommendations(user?.id || null);
  const lastTrackedProductViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!product?.id) return;
    trackViewContent(product.id, product.title, Number(product.price) || 0);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id || lastTrackedProductViewRef.current === product.id) return;
    lastTrackedProductViewRef.current = product.id;
    recommendations.track({
      eventType: 'product_view',
      product,
      productId: product.id,
      metadata: { source: 'product_detail' },
    });
  }, [product?.id, recommendations.track]);

  // Lightweight non-blocking tracker helper (same pattern as Products.tsx)
  const sendTrackingEvent = (payload: Record<string, any>) => {
    try {
      // Ensure a persistent session id exists for anonymous users
      try {
        if (typeof window !== 'undefined') {
          let sid = localStorage.getItem('sessionId');
          if (!sid) {
            sid = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            try { localStorage.setItem('sessionId', sid || ''); } catch (e) { }
          }
          payload.sessionId = payload.sessionId || sid;
        }
      } catch (e) { }

      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => { });
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

    // Allow guest users to add to local cart; use addToCart hook which supports guest localStorage

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
      trackAddToCart(product.id, product.title, Number(product.price) || 0, quantity);
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
      } catch (e) { }
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

    // Allow guest users to add to cart then navigate to checkout (Inline auth appears there)

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
      } catch (e) { }
      navigate('/checkout');
    } catch (error) {
      console.error('[ProductDetail] QuickCheckout exception', error);
      toast.error('Failed to proceed to checkout');
    }
  };

  const handleWishlistClick = async () => {
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

  const similarVehicleProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.similarVehicleParts(allProducts || [], product, isMobile ? 6 : 12);
  }, [allProducts, isMobile, product, recommendations]);

  const completeRepairProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.completeRepairProducts(allProducts || [], product, isMobile ? 6 : 12);
  }, [allProducts, isMobile, product, recommendations]);

  const frequentlyBoughtTogetherProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.frequentlyBoughtTogetherProducts(allProducts || [], product, isMobile ? 6 : 12);
  }, [allProducts, isMobile, product, recommendations]);

  if (!productId) return null;

  const canonicalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/product/${productId}`
    : `/product/${productId}`;
  const seoTitle = product?.title ? `${product.title} | MotorVault` : 'Product Details | MotorVault';
  const seoDescription = product?.title
    ? `View ${product.title} on MotorVault. Compare pricing, check availability, and shop secure automotive parts and accessories.`
    : 'View premium automotive parts and accessories on MotorVault.';
  const seoImage =
    product?.cover_image_url ||
    images?.[0]?.image_url ||
    'https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp';
  const seoKeywords = [
    'automotive parts',
    'car parts',
    'OEM parts',
    'aftermarket parts',
    product?.brand,
    product?.model,
    product?.category_name,
  ].filter((value): value is string => Boolean(value && value.trim()));

  if (isLoading) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          canonical={canonicalUrl}
          ogType="product"
          ogImage={seoImage}
          keywords={seoKeywords}
        />
        <ProductDetailSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          canonical={canonicalUrl}
          ogType="product"
          ogImage={seoImage}
          keywords={seoKeywords}
        />
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
      </>
    );
  }


  if (!product) return null;

  const currentPrice = Number(product.price);
  const originalPrice = product.original_price ? Number(product.original_price) : null;

  // Use centralized currency client (initialized at app bootstrap)
  // Always show USD for African users (enforced in currencyClient)
  const currencyCode = currencyClient.getCurrencyCode();
  // Use USD for African users, else use detected currency
  const formatPrice = (n: number) => {
    if (currencyClient.isAfricanUser()) {
      return currencyClient.formatUSD(n);
    }
    const rate = currencyClient.getCurrencyRate() || 1;
    const symbol = currencyClient.getCurrencySymbolLocal();
    return `${symbol}${(n * rate).toFixed(2)}`;
  };

  // Calculate accurate discount percentage and local discount amount
  let discountPercentage = 0;
  let discountAmount = 0;

  if (product.discount && Number(product.discount) > currentPrice) {
    const discountValue = Number(product.discount);
    const currentLocalPrice = currencyClient.convertUSD(currentPrice);
    const discountLocalValue = currencyClient.convertUSD(discountValue);
    discountAmount = discountLocalValue - currentLocalPrice;
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
  const schemaPrice = currencyClient.isAfricanUser()
    ? currentPrice
    : currencyClient.convertUSD(currentPrice);
  const schemaCurrencyCode = currencyClient.isAfricanUser()
    ? 'USD'
    : currencyCode || 'USD';
  const productSchemaImages = allImages
    .map((image) => getHighResImageUrl(image.image_url))
    .filter((image): image is string => Boolean(image));
  const productSchemaDescription = productDescription || product.title || seoDescription;
  const productSchemaSku = product.part_number || String(product.id);
  const productCategoryUrl = product.category_name
    ? `/products?category=${encodeURIComponent(product.category_name)}`
    : '/products';
  const productBreadcrumbSchema = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    ...(product.category_name ? [{ name: product.category_name, url: productCategoryUrl }] : []),
    { name: product.title, url: canonicalUrl },
  ];
  const productBreadcrumbItems = [
    { label: 'Products', href: '/products' },
    ...(product.category_name ? [{ label: product.category_name, href: productCategoryUrl }] : []),
    { label: product.title, href: canonicalUrl },
  ];

  const getEnquiryContactUrl = (outOfStockOnly: boolean = false) => {
    const enquiryCopy = getEnquiryCopy(getSiteLanguage());
    const params = new URLSearchParams();
    const subjectPrefix = outOfStockOnly ? enquiryCopy.outOfStockSubject : enquiryCopy.productSubject;
    const subject = `${subjectPrefix} - ${product.title}`;

    const lines = [
      'Hello Support,',
      '',
      outOfStockOnly
        ? enquiryCopy.outOfStockLine(product.title)
        : enquiryCopy.productEnquiryLine(product.title),
      '',
      `${enquiryCopy.productLabel}: ${product.title}`,
      product.part_number ? `${enquiryCopy.partNumberLabel}: ${product.part_number}` : '',
      product.brand ? `${enquiryCopy.brandLabel}: ${product.brand}` : '',
      product.model ? `${enquiryCopy.modelLabel}: ${product.model}` : '',
      product.category_name ? `${enquiryCopy.categoryLabel}: ${product.category_name}` : '',
      Number.isFinite(Number(product.price)) ? `${enquiryCopy.priceLabel}: ${Number(product.price).toFixed(2)}` : '',
      `${enquiryCopy.productLinkLabel}: ${window.location.origin}/product/${product.id}`,
      '',
      outOfStockOnly
        ? enquiryCopy.productOutOfStockAsk
        : enquiryCopy.productGeneralAsk,
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

    return buildContactHref(params);
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
    } catch (e) { }
    navigate(getEnquiryContactUrl(false));
  };

  const fallbackSimilarProducts = allProducts
    .filter((p) => p.id !== product?.id && p.category_name === product?.category_name)
    .slice(0, isMobile ? 6 : 12);
  const similarProducts = (similarVehicleProducts.length > 0 ? similarVehicleProducts : fallbackSimilarProducts)
    .slice(0, isMobile ? 6 : 12);

  const handleRecommendationClick = (source: string, recommendedProduct: typeof product) => {
    recommendations.track({
      eventType: 'recommendation_click',
      product: recommendedProduct,
      productId: recommendedProduct.id,
      metadata: { source },
    });
  };

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalUrl}
        ogType="product"
        ogImage={seoImage}
        keywords={seoKeywords}
        productData={{
          name: product.title,
          price: schemaPrice,
          priceCurrency: schemaCurrencyCode,
          originalPrice: originalPrice ?? undefined,
          availability: isOutOfStock ? 'OutOfStock' : 'InStock',
          image: productSchemaImages.length > 0 ? productSchemaImages : seoImage,
          category: product.category_name || undefined,
          description: productSchemaDescription,
          sku: productSchemaSku,
          brand: product.brand || undefined,
          mpn: product.part_number || undefined,
          url: canonicalUrl,
          condition: product.condition || undefined,
        }}
        breadcrumbs={productBreadcrumbSchema}
      />
      <main role="main" className="bg-white min-h-screen w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <Breadcrumb
          items={productBreadcrumbItems}
          className="mb-6"
          includeStructuredData={false}
        />
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
                          className={`relative h-16 sm:h-24 w-16 sm:w-20 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-all flex-shrink-0 aspect-square ${selectedImage === actualImageIndex ? 'ring-2 ring-blue-500 bg-white' : 'bg-white border'
                            }`}
                        >
                          <span className="absolute inset-0 rounded-md overflow-hidden">
                            <img
                              src={getHighResImageUrl(img.image_url)}
                              alt={`Product image ${actualImageIndex + 1}`}
                              className="w-full h-full object-center object-contain bg-white"
                              style={{}}
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
              {discountPercentage > 0 && discountAmount > 0 && (
                <div className="mt-2 inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                  Save {discountPercentage}% - {formatPrice(discountAmount)}
                </div>
              )}
              <div className={`mt-2 inline-block px-3 py-1 rounded text-sm font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isOutOfStock ? 'Out of stock' : `${stock} in stock`}
              </div>
              <span className="text-sm font-normal text-gray-500 block mt-2">
                {discountPercentage > 0 && discountAmount > 0 ? `(You save ${formatPrice(discountAmount)})` : '(Estimated Price)'}
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
                className={`w-full border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isOutOfStock
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
                  className={`flex-1 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isOutOfStock
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

            {/* Shipping Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Truck size={18} className="text-gray-500" />
                  Reliable Worldwide Shipping
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACoCAMAAABt9SM9AAAA0lBMVEX///9FKJT/egkyAIz++O//bgDk4ev/ewA0IZnRZ0P/cAD+69v6+vs8F5D/dwD/cgD6kkX+/Pg2DY718/nu7PPCvNf90bb+xaDj3+4/H5LIwtzY0+U1BI6wp843D41CI5N5aa39jTpzYqlbRZyOgbmWir37toj/ZgCjl8VJLZX838ljTqCBcbD97+P8hCb8nFmRhrsrDJXOYziyq87Fv9pfSZ9ILJRqV6VTOpr7p2z8lk38vpT7rXr8fxT82b78m1hTOJz8zKz849D7qXATAILNWSxGWMRYAAAIxUlEQVR4nO2db1/aOhTH0QjeiwRmC0ppaSZ/FASdu4zh/lyn2+77f0sXBKQ051eaNuq2z/k+2BMbiN+l6cnJSS0UGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhnomKOa/VrWNTbHeqJKQpomG7Ezp1olvv/6num1B9Y7tXJbFnivMSsgL9e//6+/D3kxWyLJa1G5ZlAMsygGUZwLIMYFkGsCwDWJYBLMsAlmUAyzKAZRnAsgxgWQawLAOQLAfzIpnStLKqNUj5zHavgKyw1cCUbHdCJ62s6vXdCeTOdq+ALGH7ewxJLcv66EmCZRnAsgxgWQawLANYlgEsywCWZYAlWXW/MRn0b/qD9qRVco2aunW/9eFDy69HC07+WFnNdufeCZxwWb4ROkJ2e416qqZuo9f1RLBYRAVCTfuttbA/U1az/zGQntpurTzHme1eQTY6oRNtqrxA3iwt/16y6k1EtHVrKqQiP2BPOcEg8X6ceI6nN5Oitxhd6deGR5kAfTpOboCyDgKymVr8rgCmVr94MICqWkMHtVK+SdahDCmenV+AH12c0r16U6Q/6eIuURbEW8tyx8mqFoS3PtmpSlJbJdqFOqEyQz7rUw38rHhCdQtdXnwo5JPV8oibiPjFqcHVHMrEVmLg2pFV+IyKBcuXerfOy8DVl0I+WYPdw2pJ8FbrVCvY1dbpEVdkypReI1s1bd56KAKvX9dXZJTVS99MjmKdaqRoS43aTLKO/wW2qtWr7W7dgXFVe/d0STZZYzQ7U8RsfTDP+i/JloO/qiJb/x5Eu3VUo6+LZvIzyboxcTW3Fb0Tm1ldZd2w+I4m+epZpPb74BC4uj7OJ2ti2sbZzPKuSjnX6WTd3bkDc1F00ByDua26Hx1+5rLg2FCe1GL5FeIpguikeYbSZN4KQzN3ZDp6A1xtPwaMZanKLSVEOd6oN+iPu2FI/Fjtrb5uQgSbacm+b4higv3aj+UFKMCqbQcYxrKGfSpGcrqNVfxVb1NBlOwvb8Lk+CqZHJusP9C8VT5PklmLha7mO9LUuJrH3BH6xGcGjwvkHpKlpDNfSTlooZlXVuEbtDVf+JyiYDS+KMqwfU+4ii1qiEhK9hajDs12ojvwm6Vma3CbEOvm2r4/g6H83SVwtQlGbcoSrfintvXYYjG0wMByRhvZ/jR8FlkwON1HcVgkGLUoazUfbaE/9OSgUAHpoO3lYx8FcfkKQw6QlFStbcl6etJFaWpPPfWxMCEHjZjE2g6ArZxVNChEB43PiNOK+WXJtv6phcJIm3sCf0bNR6E+LkEslrfkCC3+yLaHB1q3sCwZynBO/B/iSofMh060S9WM+h7V1du6dJ9ylxw9pLZVrV3p3YKy5KRNMiR+W5+iod9y5HMu/iB9ZEA+COi08inmIf65X9LaKn+nXBluWLjErKOcgAA+02KNp9TX0CGGhQ2Lr+lslUFll5msllm6YTeg5JKctWzs7rxDwWkULRjNJqudZ7lCfg+9AUQ+N61shcHgNDKuzlFjM1m97DkDEjWjv4dMbFiRhXIxG2qfYGMzWTkSLCRUPLugQo1gO5usKMv35OozbmsmS4+e8gGrxKk0kKUd6eTgdCszmk9W17IsR1tVrqDiV1vb95coF7ivJeZzybq3LCug92Dp+91arcMJfCRWD8lg9NeQJZr09xTePqeswjuYgYAPwgyyyIxyDl5nZJ3iYKumRf3ZZdme4F9lzjpJmLNg8J5BFvUfHiYc84lCRQNhPD2zhrrfLcm6TA7iy6gcyVgWEZTKSSsd1OrYG9PfQ+Yd7MiCO9TrT4xv62eWRSx3RLqCSPBNir7Wp9agVmTtikkTo4fcC2k47cRxqegfzPDkdpsNWbtXOyBJ+oiZLKLGTOLqvhhTYh7yOuSlZO7Lhiyw87wNXPEYFuDqITyV6qQhhwsZaTXITJDxeUO9Xi1VhgavpQ1lEb8wmeukIJNhZPZvSEYopmnlojbqvqZzBbM0hrJ8/fL0Q4tMhoX6bUwOQQtnpFNnlVH+z7QOngiAHGLW8jtv43QmdDZMxHeHUGVgXlmwmIaiTFXomsqioiX9hHldeRqiRAzLx+bbSa02KrTJKQvt0gNqRIWuqSwyXIzvk1Zu9TG0eO7Rc9Fe2N1Me80ZTPPnk3VUBiVYqIpSr9A1P45CP9PG0Vx6aUjcb4vH3gSIUOJ20GrWm357KnAuNpcstHtfvUaRV7WqBafGsqjdsPm4cW78ZYFWxe9RlTDLhQ0YWs9fcoSC0cPaUUKFbjw4NT/oRFTILJBCzTqd2a0MyLGxrM9KU9X9LLJQMLqYmRIqdHPLKozQnaI8hcpr10/MWY4djxyyUDC6PGcCiyDiVUcZZFHnanbgrWOxUo5d2uyyUJVkeXXO5BRW6P7IKytD2b/zlJowLgu3IOsLcLFRASt0t0P5TIczB4a/cbQ0cJx5UzurLFQ8E73JYIVuMZpnznaS1eDozl48Ru+mOk1mT9Yd8LCdifmGa07zyircGNiKlUG697ttyY6tU2HwWRfP8cEiiNqm/CjrGel22iN0+trPJeL7bbyppcOZOIusZY9hhe7h5srMB8rTHc7c80I9k1oZJVdvKeXaejMbVKDvS1yhhPOmZDL76Xu3k2JwOSPyzWSJc57ySrZeY3eMbi5qx+sIBqfr+oc8ryr4MHSSdUmHLM5dNJXwoSjv69be+YcOVpTJvVRYBLF+rpZ+kkfsf6aRtdjtwbqUFDf4XQVuj14yKzF+fFUB0a33/5WLRpx9uqB/cAF26R/A9cWLVVbepUkna77aGwXU6lfJ4D75tQ6F0lh/J4Ry7lu4W8cHtkB9wi0s/Q2fUnsmRSi95bJQKc+TQdjtp8jM1we3ItycUPSkmL7AiypfG9ef9Drd4dyTup92ehM/9cAsTcZdKUQQCLHXaaOamj+RjH8aq1Jv+n7TfZG/qsUwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDMMwDPPr8T98aSNeom82CwAAAABJRU5ErkJggg==" alt="FedEx" className="h-6 object-contain" />
                <img src="data:image/jpeg;base64,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" alt="UPS" className="h-6 object-contain" />
                <img src="data:image/png;base64,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" alt="DHL" className="h-6 object-contain" />
                <img src="data:image/png;base64,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" alt="PostNL" className="h-6 object-contain" />
              </div>
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
                      {discountPercentage}% ({formatPrice(discountAmount)})
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
              <h2 className="text-2xl font-extrabold text-gray-900">Similar Vehicle Parts</h2>
              <Link href={`/products?category=${product?.category_name || ''}`}>
                <a className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                  See all <span aria-hidden="true"> →</span>
                </a>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-y-10 gap-x-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
              {similarProducts.map((p) => {
                const isWished = p.id && wishedProductIds.has(p.id);
                return (
                  <Link key={p.id} href={`/product/${p.id}`}>
                    <a
                      onClick={() => {
                        handleRecommendationClick('product_detail_similar_vehicle', p);
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
                        } catch (e) { }
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
      <ProductRecommendationSection
        title="Complete The Repair"
        products={completeRepairProducts}
        wishedProductIds={wishedProductIds}
        onWishlistToggle={async (recommendedProduct) => {
          await toggleWishlist(recommendedProduct.id);
        }}
        onProductClick={(recommendedProduct) => handleRecommendationClick('product_detail_complete_repair', recommendedProduct)}
        ctaHref={`/products?category=${encodeURIComponent(product.category_name || '')}`}
        compact
      />
      <ProductRecommendationSection
        title="Frequently Bought Together"
        products={frequentlyBoughtTogetherProducts}
        wishedProductIds={wishedProductIds}
        onWishlistToggle={async (recommendedProduct) => {
          await toggleWishlist(recommendedProduct.id);
        }}
        onProductClick={(recommendedProduct) => handleRecommendationClick('product_detail_bought_together', recommendedProduct)}
        ctaHref="/products"
        compact
      />
      </main>
    </>
  );
}
