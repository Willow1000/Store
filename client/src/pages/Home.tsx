import { Link } from 'wouter';
import { ChevronRight, Heart, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePageSkeleton } from '@/components/skeletons/HomePageSkeleton';
import { QuickViewModal } from '@/components/QuickViewModal';
import { SEOHead } from '@/components/SEOHead';
import { HeroSlideshow } from '@/components/HeroSlideshow';
import { BannerCarousel } from '@/components/BannerCarousel';
import { ProductRecommendationSection } from '@/components/ProductRecommendationSection';
import { TrustindexWidget } from '@/components/TrustindexWidget';
import { toast } from 'sonner';
import { useProducts, useCategories } from '@/hooks/useSupabaseProducts';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useIsMobile } from '@/hooks/useMobile';
import { useState, useEffect, useMemo } from 'react';
import currencyClient from '@/lib/currencyClient';
import { getHighResImageUrl } from '@/lib/images';
import { calculateShipping } from '@shared/shipping';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Product } from '@/types/supabase';

const homeBannerSlides = [
  {
    image: '/images/banners/european-car-bumper-parts-banner-home.avif',
    imageWebp: '/images/banners/european-car-bumper-parts-banner-home.webp',
    imageAlt: 'European car bumper replacement parts for collision repair and front-end restoration',
    title: 'Built to Bring Front Ends Back',
    subtitle: 'Rugged bumper parts for repairs, refreshes, and the kind of fitment that keeps cars looking sharp.',
    cta: 'Explore bumpers',
    ctaLink: '/products',
  },
  {
    image: '/images/banners/european-car-seat-parts-banner-home.avif',
    imageWebp: '/images/banners/european-car-seat-parts-banner-home.webp',
    imageAlt: 'European car interior seat components and upholstery replacement parts',
    title: 'Comfort You Can Feel on Every Drive',
    subtitle: 'Seat components and interior upgrades chosen to restore support, style, and everyday comfort.',
    cta: 'Browse seats',
    ctaLink: '/products?category=seats',
  },
  {
    image: '/images/banners/european-car-tire-parts-banner-home.avif',
    imageWebp: '/images/banners/european-car-tire-parts-banner-home.webp',
    imageAlt: 'European car tire and wheel parts focused on road grip and handling performance',
    title: 'Grip the Road with Confidence',
    subtitle: 'A tire-focused showcase for drivers who want dependable traction, better handling, and a stronger road presence.',
    cta: 'See tire options',
    ctaLink: '/products',
  },
  {
    image: '/images/banners/european-car-transmission-parts-banner-home.avif',
    imageWebp: '/images/banners/european-car-transmission-parts-banner-home.webp',
    imageAlt: 'European transmission and drivetrain replacement parts for smooth shifting reliability',
    title: 'Powertrain Parts That Keep Things Moving',
    subtitle: 'Transmission-focused parts and support for customers who want smooth shifting and reliable performance.',
    cta: 'View driveline parts',
    ctaLink: '/products',
  },
];

export default function Home() {
  const { user } = useAuth();
  const recommendations = useRecommendations(user?.id || null);
  const { products, isLoading } = useProducts(1, 100); // Fetch 100 products for homepage recommendations
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const isMobile = useIsMobile();
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(null);

  // Load recently viewed items from localStorage
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewedIds(ids);
    } catch (error) {
      console.error('Failed to load recently viewed items:', error);
    }
  }, []);

  // Get recently viewed products from the products list
  const recentlyViewedVisibleCount = isMobile ? 6 : 5;
  const recommendationVisibleCount = isMobile ? 6 : 12;

  const recentlyViewedProducts = recentlyViewedIds
    .map(id => products?.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, recentlyViewedVisibleCount);
  const hasRecentlyViewedProducts = recentlyViewedProducts.length > 0;

  const recommendedForYouProducts = useMemo(() => {
    return recommendations.recommendedProducts(products || [], recommendationVisibleCount);
  }, [products, recommendations, recommendationVisibleCount]);

  const personalizedDealProducts = useMemo(() => {
    return recommendations.personalizedDeals(products || [], recommendationVisibleCount);
  }, [products, recommendations, recommendationVisibleCount]);

  const handleRecommendationClick = (source: string, product: Product) => {
    recommendations.track({
      eventType: 'recommendation_click',
      product,
      productId: product.id,
      metadata: { source },
    });
  };

  const handleRecommendationQuickView = (source: string, productId: string) => {
    const product = products?.find((item) => String(item.id) === String(productId));
    if (product) {
      recommendations.track({
        eventType: 'product_view',
        product,
        productId,
        metadata: { source, quickView: true },
      });
    }
    setQuickViewProductId(productId);
  };

  const handleRecommendationWishlistToggle = async (product: Product) => {
    const isWished = wishedProductIds.has(product.id);
    await toggleWishlist(product.id);
    toast.success(isWished ? 'Removed from wishlist' : 'Added to wishlist!');
  };

  const getDiscountPercentage = (price: number | string, discount: number | null | undefined) => {
    if (!discount) return null;
    const currentPrice = price !== null && price !== undefined ? parseFloat(String(price)) : 0;
    const discountPrice = parseFloat(String(discount));
    if (isNaN(currentPrice) || isNaN(discountPrice) || discountPrice <= currentPrice) return null;
    return Math.round(((discountPrice - currentPrice) / discountPrice) * 100);
  };

  const displayedCategories = useMemo(() => {
    return categories.slice(0, isMobile ? 6 : 10);
  }, [categories, isMobile]);

  if (isLoading || categoriesLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <>
      <SEOHead
        title="MotorVault - Buy Automotive Parts Online | OEM & Aftermarket"
        description="Shop automotive parts from MotorVault. Wide selection of OEM and aftermarket parts. Free shipping over $1500. Quality guaranteed. Shop now!"
        keywords={['automobile parts', 'car parts', 'auto parts', 'aftermarket parts', 'OEM parts', 'motor parts online']}
        canonical="https://motorvault.shop"
      />
      <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
        {/* Hero Slideshow */}
        <HeroSlideshow />

        {/* Google Reviews Widget - high-visibility homepage placement */}
        <section className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-10 sm:py-12">
          <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Trusted Reviews</p>
                <h2 className="mt-2 text-3xl font-extrabold text-slate-900">See why customers love MotorVault</h2>
              </div>
            </div>
            <TrustindexWidget />
          </div>
        </section>

        {/* Your Recently Viewed Items Section */}
      {hasRecentlyViewedProducts && (
        <div className="bg-white border-b">
          <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-extrabold text-gray-900">Your Recently Viewed</h2>
              <Link href="/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Recently Viewed Grid */}
            <div className="grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
              {recentlyViewedProducts.map((product, idx) => {
                if (!product) return null;
                const discountPercentage = getDiscountPercentage(product.price, product.discount);
                const isWished = product.id && wishedProductIds.has(product.id);
                const stock = Number(product.stock ?? 0);
                const price = parseFloat(String(product.price ?? 0));

                return (
                  <Link key={product.id} href={`/product/${product.id}`} className="product-card group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      {/* Image Container */}
                      <div className="relative w-full pt-[100%] bg-white group-hover:opacity-75 transition-opacity">
                        <img
                          src={getHighResImageUrl(product.cover_image_url)}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-contain p-6"
                          loading="lazy"
                          decoding="async"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {discountPercentage && (
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-red-600 text-white text-xs sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                            -{discountPercentage}%
                          </div>
                        )}
                        <div className={`absolute bottom-2 sm:bottom-3 left-2 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold ${stock === 0 ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-800'}`}>
                          {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                        </div>
                        {/* Wishlist Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleWishlist(product.id);
                            toast.success(isWished ? 'Removed from wishlist' : 'Added to wishlist!');
                          }}
                          className="absolute top-3 right-3 bg-white p-2 rounded-full hover:bg-gray-100 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Heart
                            className="w-5 h-5"
                            fill={isWished ? 'currentColor' : 'none'}
                            color={isWished ? '#ef4444' : '#999'}
                          />
                        </button>
                        {/* Quick View Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setQuickViewProductId(product.id);
                          }}
                          className="absolute top-16 right-3 bg-white p-2 rounded-full hover:bg-gray-100 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-grow">
                        {/* Title */}
                        <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 line-clamp-2 min-h-[30px] sm:min-h-[40px]">
                          {product.title}
                        </h3>

                        {/* Price Section */}
                        <div className="mt-2 sm:mt-4 flex items-baseline space-x-1 sm:space-x-2">
                          <span className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">
                            {currencyClient.isAfricanUser()
                              ? currencyClient.formatUSD(product.price)
                              : (() => {
                                  const rate = currencyClient.getCurrencyRate() || 1;
                                  const symbol = currencyClient.getCurrencySymbolLocal();
                                  return `${symbol}${(parseFloat(String(product.price)) * rate).toFixed(2)}`;
                                })()
                            }
                          </span>
                          {product.discount && (
                            <span className="text-xs sm:text-sm text-gray-500 line-through">
                              {currencyClient.isAfricanUser()
                                ? currencyClient.formatUSD(product.discount)
                                : (() => {
                                    const rate = currencyClient.getCurrencyRate() || 1;
                                    const symbol = currencyClient.getCurrencySymbolLocal();
                                    return `${symbol}${(parseFloat(String(product.discount)) * rate).toFixed(2)}`;
                                  })()
                              }
                            </span>
                          )}
                        </div>
                        {/* Shipping Info */}
                        {calculateShipping(price) === 0 && (
                          <p className="mt-1 text-xs sm:text-xs md:text-sm text-green-600 font-medium">Free shipping</p>
                        )}

                        {/* View Deal Button */}
                        <div className="mt-auto pt-2 sm:pt-4">
                          <button className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-colors">
                            View Deal
                          </button>
                        </div>
                      </div>
                </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ProductRecommendationSection
        title="Recommended For You"
        products={recommendedForYouProducts}
        wishedProductIds={wishedProductIds}
        onWishlistToggle={handleRecommendationWishlistToggle}
        onQuickView={(productId) => handleRecommendationQuickView('home_recommended_for_you', productId)}
        onProductClick={(product) => handleRecommendationClick('home_recommended_for_you', product)}
        ctaHref="/products"
        compact
      />

      <section className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <BannerCarousel slides={homeBannerSlides} tone="dark" />
      </section>

      <ProductRecommendationSection
        title="Deals You May Like"
        products={personalizedDealProducts}
        wishedProductIds={wishedProductIds}
        onWishlistToggle={handleRecommendationWishlistToggle}
        onQuickView={(productId) => handleRecommendationQuickView('home_personalized_deals', productId)}
        onProductClick={(product) => handleRecommendationClick('home_personalized_deals', product)}
        ctaHref="/products"
        ctaLabel="Shop deals"
        compact
      />

      {/* Shop by Category Section */}
      <div className="bg-white py-6">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 md:px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Shop by Category</h2>
            <Link href="/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoriesLoading ? (
              Array.from({ length: isMobile ? 6 : 10 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))
            ) : displayedCategories.length > 0 ? (
              displayedCategories.map((cat) => (
                <Link key={cat.id} href={`/products?category=${encodeURIComponent(cat.slug || cat.name || '')}`}>
                  <div className="group relative h-40 overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                    {/* Fallback visual layer (shown when image is missing or fails) */}
                    <div className="absolute inset-0 flex items-center justify-center text-5xl leading-none text-white/90">
                      {cat.icon || '📦'}
                    </div>

                    {cat.image_url && (
                      <img
                        src={getHighResImageUrl(cat.image_url)}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Text contrast overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 font-semibold text-white text-sm text-center line-clamp-2">
                      {cat.name}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-gray-500 text-lg">No categories available ({categories.length} categories loaded)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {quickViewProductId && (
        <QuickViewModal
          productId={quickViewProductId}
          isOpen={!!quickViewProductId}
          onClose={() => setQuickViewProductId(null)}
        />
      )}
      </div>
    </>
  );
}
