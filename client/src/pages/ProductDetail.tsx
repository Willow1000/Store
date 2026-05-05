import { useRoute, useLocation } from 'wouter';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons/ProductDetailSkeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/_core/hooks/useAuth';
import { useProductById, useProducts } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useState, useEffect } from 'react';
import { getHighResImageUrl } from '@/lib/images';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, navigate] = useLocation();
  const productId = params?.id;
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { product, images, isLoading, error } = useProductById(productId || '');
  const { products: allProducts } = useProducts(1, 200); // Fetch products for similar items
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);

  // Combine cover image with product images
  const allImages: Array<{ id: string; image_url: string }> = product?.cover_image_url
    ? [
        { id: 'cover', image_url: product.cover_image_url },
        ...(images || [])
      ]
    : images || [];

  console.log('ProductDetail Debug:', { 
    productId,
    product,
    images,
    allImages,
    isLoading 
  });

  const handleAddToCart = async () => {
    console.log('[ProductDetail] AddToCart clicked', {
      isAuthenticated,
      userId: user?.id,
      productId: product?.id,
      quantity,
    });

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
      console.log('[ProductDetail] AddToCart sending mutation', {
        productId: product.id,
        quantity,
      });
      const added = await addToCart(product.id, quantity);

      if (!added) {
        console.error('[ProductDetail] AddToCart failed: hook returned false');
        return;
      }
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
    } catch (error) {
      console.error('[ProductDetail] AddToCart exception', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    console.log('[ProductDetail] QuickCheckout clicked', {
      isAuthenticated,
      userId: user?.id,
      productId: product?.id,
      quantity,
    });

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
      
      console.log('[ProductDetail] QuickCheckout adding item before redirect', {
        productId: product.id,
        quantity,
      });
      const added = await addToCart(product.id, quantity);
      console.log('[ProductDetail] QuickCheckout add result', { added });
      if (!added) {
        return;
      }
      console.log('[ProductDetail] QuickCheckout navigating to /checkout');
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

  if (!productId) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

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

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  const currentPrice = Number(product.price);
  const originalPrice = product.original_price ? Number(product.original_price) : null;
  
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
              <div className="w-16 sm:w-full sm:mt-6 flex flex-col sm:flex-row max-w-2xl sm:mx-auto lg:max-w-none">
                <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 w-full">
                  {allImages.slice(0, 4).map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative h-16 sm:h-24 w-16 sm:w-full rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-all flex-shrink-0 ${
                        selectedImage === idx ? 'ring-2 ring-blue-500 bg-white' : 'bg-white border'
                      }`}
                    >
                      <span className="absolute inset-0 rounded-md overflow-hidden">
                        <img
                          src={getHighResImageUrl(img.image_url)}
                          alt={`Product image ${idx + 1}`}
                          className="w-full h-full object-center object-contain"
                          crossOrigin="anonymous"
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Image */}
            <div className="flex-1 sm:w-full">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border">
                {allImages && allImages.length > 0 && allImages[selectedImage] ? (
                  <img
                    key={`main-${selectedImage}`}
                    src={getHighResImageUrl(allImages[selectedImage].image_url)}
                    alt={`${product.title}`}
                    fetchPriority="high"
                    loading="eager"
                    className="w-full h-full object-center object-contain p-4 min-h-[300px] sm:min-h-[400px]"
                    style={{ imageRendering: 'auto' }}
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f5f5f5" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-400">No image available</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Product Info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            {/* Title */}
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>

            {/* Price */}
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <p className="text-3xl text-gray-900 font-bold">
                  ${currentPrice.toFixed(2)}
                </p>
                {product.discount && Number(product.discount) > currentPrice && (
                  <p className="text-2xl text-gray-500 line-through">
                    ${Number(product.discount).toFixed(2)}
                  </p>
                )}
              </div>
              {discountPercentage > 0 && (
                <div className="mt-2 inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                  Save {discountPercentage}% - ${discountAmount.toFixed(2)}
                </div>
              )}
              <div className={`mt-2 inline-block px-3 py-1 rounded text-sm font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isOutOfStock ? 'Out of stock' : `${stock} in stock`}
              </div>
              <span className="text-sm font-normal text-gray-500 block mt-2">{discountPercentage > 0 ? `(You save $${discountAmount.toFixed(2)})` : '(Estimated Price)'}</span>
            </div>

            {/* Rating */}
            <div className="mt-3 flex items-center">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              <p className="ml-3 text-sm text-gray-500">48 watchers interested</p>
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
                {isOutOfStock ? 'Out of Stock' : 'Quick Purchase - Checkout Now'}
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

              {/* Continue Shopping Button */}
              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-gray-700 bg-white hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition-all duration-200"
              >
                ← Continue Shopping
              </button>

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
                        This item is currently out of stock. Please <a href={`/contact?subject=${encodeURIComponent(`Out of Stock Inquiry - ${product?.title}`)}&message=${encodeURIComponent(`I am interested in the product "${product?.title}" which is currently out of stock. Please let me know when it will be available again.`)}`} className="underline hover:text-red-900 font-bold">contact support</a> for availability information.
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

          {/* Item Specifics / Additional Details */}
          {product.item_specifics && typeof product.item_specifics === 'object' && Object.keys(product.item_specifics).length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Details</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <dl className="space-y-4">
                  {Object.entries(product.item_specifics).map(([key, value]) => (
                    value !== null && value !== undefined && value !== '' && (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <dt className="text-sm font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</dt>
                        <dd className="text-sm font-semibold text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    )
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Product Information Section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Information</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {product.price && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Current Price:</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      ${currentPrice.toFixed(2)}
                    </dd>
                  </div>
                )}
                {product.discount && Number(product.discount) > currentPrice && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Original Price:</dt>
                    <dd className="text-sm font-semibold text-gray-500 line-through">
                      ${Number(product.discount).toFixed(2)}
                    </dd>
                  </div>
                )}
                {discountPercentage > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm font-medium text-gray-700">Discount:</dt>
                    <dd className="text-sm font-semibold text-green-600">
                      {discountPercentage}% (${discountAmount.toFixed(2)})
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
                    <a className="group relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                          ${parseFloat(String(p.price)).toFixed(2)}
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
