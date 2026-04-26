import { useRoute, useLocation } from 'wouter';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { ProductDetailSkeleton } from '@/components/skeletons/ProductDetailSkeleton';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { useProductById, useProducts } from '@/hooks/useSupabaseProducts';
import { useSupabaseCart, useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useState, useEffect } from 'react';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, navigate] = useLocation();
  const productId = params?.id;
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { product, images, isLoading } = useProductById(productId || '');
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
    if (!isAuthenticated || !user?.id) {
      openAuthModal('login', 'cart');
      return;
    }

    if (!product?.id) {
      toast.error('Product information is missing');
      return;
    }

    try {
      await addToCart(product.id, quantity);
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated || !user?.id) {
      openAuthModal('login', 'checkout');
      return;
    }

    try {
      if (!product?.id) {
        toast.error('Product information is missing');
        return;
      }
      
      await addToCart(product.id, quantity);
      navigate('/checkout');
    } catch (error) {
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
      <div className="container py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  const currentPrice = product.price;
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
    <main role="main" className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Detail Grid */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* LEFT COLUMN - Image Gallery */}
          <div className="flex flex-col-reverse">
            {/* Thumbnail Gallery */}
            {allImages && allImages.length > 1 && (
              <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                <div className="grid grid-cols-4 gap-4">
                  {allImages.slice(0, 4).map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative h-24 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 ${
                        selectedImage === idx ? 'ring-2 ring-blue-500 bg-white' : 'bg-white border'
                      }`}
                    >
                      <span className="absolute inset-0 rounded-md overflow-hidden">
                        <img
                          src={img.image_url}
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
            <div className="w-full">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border">
                {allImages && allImages.length > 0 && allImages[selectedImage] ? (
                  <img
                    key={`main-${selectedImage}`}
                    src={allImages[selectedImage].image_url}
                    alt={`${product.title}`}
                    fetchPriority="high"
                    loading="eager"
                    className="w-full h-full object-center object-contain p-4 min-h-[400px]"
                    style={{ imageRendering: 'high-quality' }}
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
              <p className="text-3xl text-gray-900 font-bold">
                ${parseFloat(String(product.price)).toFixed(2)} 
                <span className="text-sm font-normal text-gray-500"> (Estimated Price)</span>
              </p>
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

            {/* Key Specifications */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-sm font-medium text-gray-900">Key Specifications</h3>
              <div className="mt-4">
                <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <li className="bg-white px-4 py-3 border rounded-md shadow-sm">
                    <span className="block text-xs text-gray-500 uppercase">Condition</span>
                    <span className="block text-sm font-bold capitalize">{product.condition || 'New'}</span>
                  </li>
                  <li className="bg-white px-4 py-3 border rounded-md shadow-sm">
                    <span className="block text-xs text-gray-500 uppercase">Category</span>
                    <span className="block text-sm font-bold">{product.category_name || 'Product'}</span>
                  </li>
                  <li className="bg-white px-4 py-3 border rounded-md shadow-sm">
                    <span className="block text-xs text-gray-500 uppercase">Stock Status</span>
                    <span className="block text-sm font-bold text-green-600">In Stock</span>
                  </li>
                  <li className="bg-white px-4 py-3 border rounded-md shadow-sm">
                    <span className="block text-xs text-gray-500 uppercase">Availability</span>
                    <span className="block text-sm font-bold">Ready to Ship</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 space-y-3">
              {/* Quick Purchase Button */}
              <button
                onClick={handleBuyNow}
                className="w-full bg-green-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Quick Purchase - Checkout Now
              </button>

              {/* Add to Cart & Wishlist Row */}
              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </button>
                <button
                  onClick={handleWishlistClick}
                  className="bg-white border border-gray-300 rounded-md py-3 px-4 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Heart className="h-6 w-6" fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>
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
                          src={p.cover_image_url || ''}
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
