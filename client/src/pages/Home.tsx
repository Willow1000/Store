import { Link } from 'wouter';
import { ChevronRight, Heart, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePageSkeleton } from '@/components/skeletons/HomePageSkeleton';
import { QuickViewModal } from '@/components/QuickViewModal';
import { SEOHead } from '@/components/SEOHead';
import { HeroSlideshow } from '@/components/HeroSlideshow';
import { toast } from 'sonner';
import { useProducts, useCategories } from '@/hooks/useSupabaseProducts';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useIsMobile } from '@/hooks/useMobile';
import { useState, useEffect, useMemo } from 'react';
import { getHighResImageUrl } from '@/lib/images';
import { calculateShipping } from '@shared/shipping';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { products, isLoading } = useProducts(1, 100); // Fetch 100 products for best deals selection
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
  const recentlyViewedProducts = recentlyViewedIds
    .map(id => products?.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 5);

  // Filter deals: exactly 5 products from different categories with best offers (new or past items)
  // Shows products with: price >= 1500 (premium), 7%+ discount, or free shipping
  const dealsProducts = (() => {
    const eligibleProducts = products?.filter((p) => {
      const price = p.price !== null && p.price !== undefined
        ? parseFloat(String(p.price))
        : 0;
      const discount = p.discount !== null && p.discount !== undefined
        ? parseFloat(String(p.discount))
        : 0;
      
      // Check if product has free shipping
      const hasFreeShipping = p.freeShipping === true;
      
      // If free shipping, it qualifies
      if (hasFreeShipping) return true;
      
      // If price is above 1500 (premium items), it qualifies
      if (price >= 1500) return true;
      
      if (discount <= 0 || isNaN(discount) || price <= 0) return false;
      
      // Calculate discount percentage
      const discountPercentage = discount > 0 && price > 0
        ? Math.round(((discount - price) / discount) * 100)
        : 0;
      
      // Include products with 7%+ discount
      return discountPercentage >= 7;
    }) || [];

    const uniqueByCategory = new Map<string, (typeof eligibleProducts)[number]>();
    eligibleProducts.forEach((product) => {
      const categoryKey = String(product.category_name || product.category || 'uncategorized').trim().toLowerCase();
      if (!uniqueByCategory.has(categoryKey)) {
        uniqueByCategory.set(categoryKey, product);
      }
    });

    // Return exactly 5 products from different categories, sorted by combined deal score (premium + discount)
    return Array.from(uniqueByCategory.values())
      .sort((a, b) => {
        const priceA = parseFloat(String(a.price ?? 0));
        const priceB = parseFloat(String(b.price ?? 0));
        const discountA = parseFloat(String(a.discount ?? 0));
        const discountB = parseFloat(String(b.discount ?? 0));
        
        // Calculate discount percentage for both
        const discountPercentA = discountA > 0 && priceA > 0
          ? Math.round(((discountA - priceA) / discountA) * 100)
          : 0;
        const discountPercentB = discountB > 0 && priceB > 0
          ? Math.round(((discountB - priceB) / discountB) * 100)
          : 0;
        
        // Combined deal score: normalize price to score (price/1500) + discount percentage
        // This gives premium items value while also rewarding good discounts
        const scoreA = (priceA / 1500) + discountPercentA;
        const scoreB = (priceB / 1500) + discountPercentB;
        
        return scoreB - scoreA;
      })
      .slice(0, 5);
  })();

  const getDiscountPercentage = (price: number | string, discount: number | null | undefined) => {
    if (!discount) return null;
    const currentPrice = price !== null && price !== undefined ? parseFloat(String(price)) : 0;
    const discountPrice = parseFloat(String(discount));
    if (isNaN(currentPrice) || isNaN(discountPrice) || discountPrice <= currentPrice) return null;
    return Math.round(((discountPrice - currentPrice) / discountPrice) * 100);
  };

  const getOriginalPrice = (price: number | string, discount: number) => {
    const numPrice = price !== null && price !== undefined ? parseFloat(String(price)) : 0;
    if (isNaN(numPrice)) return '0.00';
    return (numPrice / (1 - discount / 100)).toFixed(2);
  };

  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return '0.00';
    const num = parseFloat(String(price));
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const displayedCategories = useMemo(() => {
    return categories.slice(0, isMobile ? 5 : 10);
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
        canonical="https://motorvault.com"
      />
      <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
        {/* Hero Slideshow */}
        <HeroSlideshow />

        {/* Your Recently Viewed Items Section */}
      {recentlyViewedProducts.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-extrabold text-gray-900">Your Recently Viewed</h2>
              <Link href="/products">
                <a className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </a>
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
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <a className="product-card group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
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
                            if (!isAuthenticated || !user?.id) {
                              openAuthModal('login', 'wishlist');
                              return;
                            }
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
                            ${formatPrice(product.price)}
                          </span>
                          {product.discount && (
                            <span className="text-xs sm:text-sm text-gray-500 line-through">
                              ${formatPrice(product.discount)}
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
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="bg-white">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900">Best Deals</h1>
            <p className="mt-2 text-lg text-gray-600">Premium items above $1500, 7%+ discounts, and free shipping options from different categories</p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ))
            ) : (
              dealsProducts?.slice(0, 5).map((product, idx) => {
                const discountPercentage = getDiscountPercentage(product.price, product.discount);
                const originalPrice = product.discount ? parseFloat(String(product.discount)).toFixed(2) : null;
                const isWished = product.id && wishedProductIds.has(product.id);
                const stock = Number(product.stock ?? 0);
                const price = parseFloat(String(product.price ?? 0));

                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <a className="product-card group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
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
                        {/* Discount Badge */}
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
                            if (!isAuthenticated || !user?.id) {
                              openAuthModal('login', 'wishlist');
                              return;
                            }
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
                            ${parseFloat(String(product.price)).toFixed(2)}
                          </span>
                          {originalPrice && (
                            <span className="text-xs sm:text-sm text-gray-500 line-through">
                              ${originalPrice}
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
                    </a>
                  </Link>
                );
              })
            )}
          </div>

          {/* View All Button */}
          <div className="mt-12 text-center">
            <Link href="/products">
              <a className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                Browse More Deals
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* Shop by Category Section */}
      <div className="bg-white py-6">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 md:px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Shop by Category</h2>
            <Link href="/products">
              <a className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoriesLoading ? (
              Array.from({ length: isMobile ? 5 : 10 }).map((_, i) => (
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
