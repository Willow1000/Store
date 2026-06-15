import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { readCartFromStorage } from '@/lib/cart';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseCart } from '@/hooks/useSupabaseCart';
import { useProducts } from '@/hooks/useSupabaseProducts';
import { getHighResImageUrl } from '@/lib/images';
import { calculateShipping } from '@shared/shipping';
import currencyClient from '@/lib/currencyClient';
import { calculateVariableVat } from '@/lib/vat';
import { SITE_LANGUAGE_CHANGED_EVENT, getSiteLanguage, translateText, type SiteLanguageCode } from '@/lib/language';

interface CartItem {
  productId?: string;
  productIndex: string | number;
  title: string;
  price: string;
  image: string;
  quantity: number;
}

type ProductLookup = {
  id: string;
  title: string;
  price: number;
  cover_image_url: string;
  stock?: number | null;
};

export default function Cart() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const {
    items: supabaseCartItems,
    isLoading: isSupabaseLoading,
    updateQuantity: updateSupabaseQuantity,
    removeFromCart: removeSupabaseItem,
  } = useSupabaseCart(user?.id || null);
  const { products: dbProducts } = useProducts(1, 500);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<SiteLanguageCode>(() => getSiteLanguage());

  const t = (key: string, fallback: string) => translateText(language, key, fallback);

  // Load cart items from localStorage
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const savedCart = localStorage.getItem('cart');
    const items = readCartFromStorage(savedCart);
    setCartItems(items);
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    const onLanguageChanged = () => setLanguage(getSiteLanguage());
    window.addEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
    window.addEventListener('storage', onLanguageChanged);
    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
      window.removeEventListener('storage', onLanguageChanged);
    };
  }, []);

  const effectiveCartItems: CartItem[] = isAuthenticated
    ? supabaseCartItems.map((item) => ({
        productIndex: item.product_id,
        productId: item.product_id,
        title: item.product?.title || 'Product',
        price: `$ ${Number(item.product?.price || 0).toFixed(2)}`,
        image: item.product?.cover_image_url || '',
        quantity: item.quantity,
      }))
    : cartItems;

  const productsById = useMemo(() => {
    return new Map((dbProducts as ProductLookup[]).map((product) => [product.id, product]));
  }, [dbProducts]);

  const resolveProduct = (item: CartItem) => {
    const byId = item.productId ? productsById.get(item.productId) : undefined;
    if (byId) return byId;

    const legacyIndex = typeof item.productIndex === 'number' ? item.productIndex : Number(item.productIndex);
    if (Number.isFinite(legacyIndex) && legacyIndex >= 0) {
      return dbProducts[legacyIndex] as ProductLookup | undefined;
    }

    return undefined;
  };

  const persistLocalCart = (updatedCart: CartItem[]) => {
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateCartQuantity = async (productIndex: string | number, newQuantity: number) => {
    if (isAuthenticated) {
      const item = supabaseCartItems.find((cartItem) => String(cartItem.product_id) === String(productIndex));
      if (!item?.id) {
        toast.error(t('cart.itemNotFound', 'Cart item not found'));
        return;
      }
      await updateSupabaseQuantity(item.id, newQuantity);
      return;
    }

    if (newQuantity <= 0) {
      await removeFromCart(productIndex);
      return;
    }

    const updatedCart = cartItems.map(item =>
      item.productIndex === productIndex ? { ...item, quantity: newQuantity } : item
    );
    persistLocalCart(updatedCart);
    toast.success(t('cart.updated', 'Cart updated!'));
  };

  const removeFromCart = async (productIndex: string | number) => {
    if (isAuthenticated) {
      const item = supabaseCartItems.find((cartItem) => String(cartItem.product_id) === String(productIndex));
      if (!item?.id) {
        toast.error(t('cart.itemNotFound', 'Cart item not found'));
        return;
      }
      await removeSupabaseItem(item.id);
      return;
    }

    const updatedCart = cartItems.filter(item => item.productIndex !== productIndex);
    persistLocalCart(updatedCart);
    toast.success(t('cart.itemRemoved', 'Item removed from cart!'));
  };

  // Calculate totals
  const subtotal = effectiveCartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
    return sum + (price * item.quantity);
  }, 0);

  const shipping = calculateShipping(subtotal);
  const vatSummary = calculateVariableVat(
    effectiveCartItems.map((item) => ({
      productId: item.productId ? String(item.productId) : String(item.productIndex),
      title: item.title,
      unitPrice: parseFloat(item.price.replace(/[^\d.]/g, '') || '0'),
      quantity: item.quantity,
    }))
  );
  const vat = vatSummary.totalVat;
  const total = subtotal + shipping + vat;

  if (isLoading || (isAuthenticated && isSupabaseLoading)) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 space-y-6">
          <Skeleton className="h-10 w-56" />
          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 rounded-lg border border-border bg-white p-4">
                  <Skeleton className="h-24 w-24 rounded-lg bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-10 w-10 rounded-md" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-white p-5">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const enrichedCartItems = effectiveCartItems.map((item) => {
    const product = resolveProduct(item);
    return {
      ...item,
      productId: item.productId || product?.id,
      stock: product?.stock ?? null,
    };
  });

  if (effectiveCartItems.length === 0) {
    return (
          <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12 sm:py-16">
          <p className="mb-4 text-lg sm:text-xl font-semibold text-gray-900">{t('cart.empty', 'Your cart is empty')}</p>
          <p className="mb-8 text-sm sm:text-base text-gray-600 text-center max-w-sm">{t('cart.startShopping', 'Start shopping to add items to your cart')}</p>

          {!isAuthenticated && (
            <div className="mb-6 w-full max-w-md flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-900 text-center">
                Sign in to access your account cart and saved items.
              </p>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('oauth_return_to', '/cart');
                  } catch {
                    // ignore storage issues
                  }
                  window.dispatchEvent(
                    new CustomEvent('auth:required', {
                      detail: {
                        actionType: 'cart',
                        redirectTo: '/cart',
                      },
                    })
                  );
                }}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Login to Access Cart
              </button>
            </div>
          )}

          <Link href="/products">
            <a className="inline-flex items-center gap-2 px-6 py-3 sm:py-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base">
              {t('header.browseProducts', 'Browse Products')}
              <ArrowRight size={18} />
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="mb-6 sm:mb-8 text-3xl sm:text-4xl font-bold text-gray-900">{t('common.cart', 'Shopping Cart')}</h1>

        {!isAuthenticated && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-blue-900">
              Sign in to access your account cart and saved items.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('oauth_return_to', '/cart');
                } catch {
                  // ignore storage issues
                }
                window.dispatchEvent(
                  new CustomEvent('auth:required', {
                    detail: {
                      actionType: 'cart',
                      redirectTo: '/cart',
                    },
                  })
                );
              }}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Login to Access Cart
            </button>
          </div>
        )}

        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              {enrichedCartItems.map((item) => (
                <div key={item.productId || item.productIndex} className="flex gap-4 rounded-lg border border-border bg-white p-4">
                  {/* Product Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {item.image ? (
                      <img
                        src={getHighResImageUrl(item.image)}
                        alt={item.title}
                        className="h-full w-full object-contain p-2"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <Link href={`/product/${item.productId || item.productIndex}`}>
                      <span className="font-semibold hover:text-blue-600 line-clamp-2">{item.title}</span>
                    </Link>
                    <p className="mb-3 text-sm text-gray-600">
                      {currencyClient.formatUSD(parseFloat(item.price.replace(/[^\d.]/g, '') || '0'))}
                    </p>
                    <p className={`mb-3 text-xs font-semibold ${item.stock === 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.stock === 0
                        ? 'Out of stock'
                        : item.stock != null
                          ? `${item.stock} in stock`
                          : 'Stock information unavailable'}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.productIndex, item.quantity - 1)}
                        className="rounded-md border border-border px-3 py-2 hover:bg-secondary transition-colors min-h-10 min-w-10 flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.productIndex, item.quantity + 1)}
                        disabled={item.stock === 0}
                        className="rounded-md border border-border px-3 py-2 hover:bg-secondary transition-colors min-h-10 min-w-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Price & Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-bold text-sm sm:text-base">
                      {currencyClient.formatUSD((parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity))}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.productIndex)}
                      className="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors min-h-10 min-w-10 flex items-center justify-center"
                      aria-label="Remove from cart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping */}
            <Link href="/products">
              <a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:text-gray-600">
                ← {t('cart.continueShopping', 'Continue Shopping')}
              </a>
            </Link>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg border border-border bg-white p-4 sm:p-6 h-fit">
            <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold">{t('checkout.orderSummary', 'Order Summary')}</h2>

            <div className="space-y-3 sm:space-y-4 border-b border-border pb-4">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">{t('checkout.subtotal', 'Subtotal')}</span>
                <span className="font-semibold">{currencyClient.formatUSD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">{t('checkout.shipping', 'Shipping')}</span>
                <span className="font-semibold">
                  {shipping === 0 ? t('checkout.free', 'FREE') : currencyClient.formatUSD(shipping)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">
                  {t('checkout.vat', 'V.A.T')} ({(vatSummary.weightedAverageRate * 100).toFixed(2)}%, max {(vatSummary.maxRate * 100).toFixed(0)}%)
                </span>
                <span className="font-semibold">{currencyClient.formatUSD(vat)}</span>
              </div>
            </div>

            <div className="my-4 flex justify-between">
              <span className="font-bold text-base sm:text-lg">{t('checkout.total', 'Total')}</span>
              <span className="text-xl sm:text-2xl font-bold">{currencyClient.formatUSD(total)}</span>
            </div>

            {shipping > 0 && (
              <p className="mb-4 text-xs text-gray-600">
                {t('checkout.freeShippingNotice', 'Shipping fee is 5% for orders under $1,500')}
              </p>
            )}

            <button
              onClick={() => {
                // Always allow navigating to checkout; inline auth will be shown on the checkout page
                navigate('/checkout');
              }}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              {t('checkout.proceedToCheckout', 'Proceed to Checkout')}
            </button>

            <Link href="/products">
              <a className="mt-3 w-full inline-block text-center py-2.5 sm:py-3 rounded-lg border border-border bg-background font-semibold hover:bg-secondary transition-colors text-sm sm:text-base">
                {t('cart.continueShopping', 'Continue Shopping')}
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
