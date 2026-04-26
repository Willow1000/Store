import { Link } from 'wouter';
import { ChevronRight, Heart, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePageSkeleton } from '@/components/skeletons/HomePageSkeleton';
import { QuickViewModal } from '@/components/QuickViewModal';
import { toast } from 'sonner';
import { useProducts, useCategories } from '@/hooks/useSupabaseProducts';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { products, isLoading } = useProducts(1, 20); // Fetch 20 products for deals
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
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
    .slice(0, 8);

  // Calculate discount percentage (demo: fixed 30-56% for variety)
  const getDiscount = (price: number | string, index: number) => {
    const discounts = [56, 46, 35, 48, 52, 42, 38, 50, 44, 36, 54, 40];
    return discounts[index % discounts.length];
  };

  const getOriginalPrice = (price: number | string, discount: number) => {
    const numPrice = parseFloat(String(price));
    return (numPrice / (1 - discount / 100)).toFixed(2);
  };

  if (isLoading || categoriesLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your Recently Viewed Items Section */}
      {recentlyViewedProducts.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">Your Recently Viewed</h2>
              <Link href="/products">
                <a className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </a>
              </Link>
            </div>

            {/* Recently Viewed Grid */}
            <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentlyViewedProducts.map((product, idx) => {
                if (!product) return null;
                const discount = getDiscount(product.price, idx);
                const originalPrice = getOriginalPrice(product.price, discount);
                const isWished = product.id && wishedProductIds.has(product.id);

                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <a className="product-card group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      {/* Image Container */}
                      <div className="relative w-full pt-[100%] bg-white group-hover:opacity-75 transition-opacity">
                        <img
                          src={product.cover_image_url || ''}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-contain p-6"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* Discount Badge */}
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          {discount}% OFF
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
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[40px]">
                          {product.title}
                        </h3>

                        {/* Price Section */}
                        <div className="mt-4 flex items-baseline space-x-2">
                          <span className="text-2xl font-bold text-gray-900">
                            ${parseFloat(String(product.price)).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${originalPrice}
                          </span>
                        </div>

                        {/* Shipping Info */}
                        <p className="mt-1 text-xs text-green-600 font-medium">Free shipping</p>

                        {/* View Deal Button */}
                        <div className="mt-auto pt-4">
                          <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">Today's Deals</h1>
            <p className="mt-2 text-lg text-gray-600">All with free shipping</p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ))
            ) : (
              products?.slice(0, 12).map((product, idx) => {
                const discount = getDiscount(product.price, idx);
                const originalPrice = getOriginalPrice(product.price, discount);
                const isWished = product.id && wishedProductIds.has(product.id);

                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <a className="product-card group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      {/* Image Container */}
                      <div className="relative w-full pt-[100%] bg-white group-hover:opacity-75 transition-opacity">
                        <img
                          src={product.cover_image_url || ''}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-contain p-6"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* Discount Badge */}
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          {discount}% OFF
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
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[40px]">
                          {product.title}
                        </h3>

                        {/* Price Section */}
                        <div className="mt-4 flex items-baseline space-x-2">
                          <span className="text-2xl font-bold text-gray-900">
                            ${parseFloat(String(product.price)).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${originalPrice}
                          </span>
                        </div>

                        {/* Shipping Info */}
                        <p className="mt-1 text-xs text-green-600 font-medium">Free shipping</p>

                        {/* View Deal Button */}
                        <div className="mt-auto pt-4">
                          <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
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
      <div className="py-12 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
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
              Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))
            ) : categories.length > 0 ? (
              categories.map((cat) => (
                <Link key={cat.id} href={`/products?category=${cat.slug}`}>
                  <a className="group relative h-40 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center hover:shadow-lg hover:scale-105 transition-all duration-300">
                    {/* Icon */}
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="mb-3 h-16 w-16 rounded-md object-cover group-hover:scale-110 transition-transform"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="mb-3 text-5xl group-hover:scale-110 transition-transform">
                        {cat.icon || '📦'}
                      </div>
                    )}
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm text-center px-2 line-clamp-2">
                      {cat.name}
                    </p>
                  </a>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-gray-500 text-lg">No categories available</p>
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
  );
}
