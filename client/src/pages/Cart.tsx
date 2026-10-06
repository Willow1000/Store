import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  LockKeyhole,
  ShoppingCart,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { readCartFromStorage } from "@/lib/cart";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSupabaseCart } from "@/hooks/useSupabaseCart";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useProducts } from "@/hooks/useSupabaseProducts";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { formatMoney } from "@/lib/pricing";
import { trackAddToCart } from "@/hooks/useMetaPixel";
import type { Product } from "@/types/supabase";
import {
  calculateShipping,
  getFreeShippingThresholdUsd,
} from "@shared/shipping";
import {
  SITE_LANGUAGE_CHANGED_EVENT,
  getSiteLanguage,
  translateText,
  type SiteLanguageCode,
} from "@/lib/language";
import {
  savePendingAuthAction,
  waitForCartMigration,
} from "@/lib/authPendingAction";

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
  const { user, isAuthenticated, sessionRestored } = useAuth();
  const {
    items: supabaseCartItems,
    isLoading: isSupabaseLoading,
    updateQuantity: updateSupabaseQuantity,
    removeFromCart: removeSupabaseItem,
    refetch: refetchSupabaseCart,
    addToCart,
  } = useSupabaseCart(user?.id || null);
  const recommendations = useRecommendations(user?.id || null);
  const { products: dbProducts } = useProducts(1, 500);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [language, setLanguage] = useState<SiteLanguageCode>(() =>
    getSiteLanguage()
  );
  const [awaitingCartHydration, setAwaitingCartHydration] = useState(() => {
    try {
      return (
        typeof window !== "undefined" &&
        sessionStorage.getItem("cart-auth-redirect-pending-v1") === "1"
      );
    } catch {
      return false;
    }
  });
  // Safety net: several independent things gate the loading skeleton
  // (session restore, the guest->account cart migration handshake,
  // useSupabaseCart's own fetch). Each has its own timeout, but if any
  // combination still leaves it stuck, force the loading state off after
  // a bound rather than showing skeletons indefinitely.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const t = (key: string, fallback: string) =>
    translateText(language, key, fallback);

  // Load cart items from localStorage
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const savedCart = localStorage.getItem("cart");
    const items = readCartFromStorage(savedCart);
    setCartItems(items);
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    const onLanguageChanged = () => setLanguage(getSiteLanguage());
    window.addEventListener(
      SITE_LANGUAGE_CHANGED_EVENT,
      onLanguageChanged as EventListener
    );
    window.addEventListener("storage", onLanguageChanged);
    return () => {
      window.removeEventListener(
        SITE_LANGUAGE_CHANGED_EVENT,
        onLanguageChanged as EventListener
      );
      window.removeEventListener("storage", onLanguageChanged);
    };
  }, []);

  const effectiveCartItems: CartItem[] = isAuthenticated
    ? supabaseCartItems.map(item => ({
        productIndex: item.product_id,
        productId: item.product_id,
        title: item.product?.title || "Product",
        price: `$ ${Number(item.product?.price || 0).toFixed(2)}`,
        image: item.product?.cover_image_url || "",
        quantity: item.quantity,
      }))
    : cartItems;

  useEffect(() => {
    if (!awaitingCartHydration) return;
    if (!isAuthenticated) return;

    if (effectiveCartItems.length > 0) {
      setAwaitingCartHydration(false);
      try {
        sessionStorage.removeItem("cart-auth-redirect-pending-v1");
      } catch {
        // ignore storage issues
      }
      return;
    }

    let cancelled = false;
    void waitForCartMigration().then(() => {
      if (!cancelled) {
        void refetchSupabaseCart();
      }
    });

    const timer = window.setTimeout(() => {
      setAwaitingCartHydration(false);
      try {
        sessionStorage.removeItem("cart-auth-redirect-pending-v1");
      } catch {
        // ignore storage issues
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    awaitingCartHydration,
    isAuthenticated,
    effectiveCartItems.length,
    refetchSupabaseCart,
  ]);

  // Who the cart belongs to is known once the Supabase session is restored;
  // the separate server-side profile check (auth.me, part of authLoading)
  // adds a round trip - or, when the API is unreachable, several retries -
  // and does not change which cart is shown, so the cart does not wait on it.
  const isWaitingOnCartData =
    !sessionRestored ||
    awaitingCartHydration ||
    (isAuthenticated && isSupabaseLoading);

  useEffect(() => {
    if (!isWaitingOnCartData) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      // One more explicit attempt before giving up on the skeleton - a
      // fresh fetchCart() call isn't subject to whatever left the
      // original attempt stuck (e.g. a stale request id).
      if (isAuthenticated) void refetchSupabaseCart();
      setLoadingTimedOut(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isWaitingOnCartData, isAuthenticated, refetchSupabaseCart]);

  const productsById = useMemo(() => {
    return new Map(
      (dbProducts as ProductLookup[]).map(product => [product.id, product])
    );
  }, [dbProducts]);

  const resolveProduct = (item: CartItem) => {
    const byId = item.productId ? productsById.get(item.productId) : undefined;
    if (byId) return byId;

    const legacyIndex =
      typeof item.productIndex === "number"
        ? item.productIndex
        : Number(item.productIndex);
    if (Number.isFinite(legacyIndex) && legacyIndex >= 0) {
      return dbProducts[legacyIndex] as ProductLookup | undefined;
    }

    return undefined;
  };

  const persistLocalCart = (updatedCart: CartItem[]) => {
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const updateCartQuantity = async (
    productIndex: string | number,
    newQuantity: number
  ) => {
    if (isAuthenticated) {
      const item = supabaseCartItems.find(
        cartItem => String(cartItem.product_id) === String(productIndex)
      );
      if (!item?.id) {
        toast.error(t("cart.itemNotFound", "Cart item not found"));
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
      item.productIndex === productIndex
        ? { ...item, quantity: newQuantity }
        : item
    );
    const changedItem = cartItems.find(
      item =>
        String(item.productIndex) === String(productIndex) ||
        String(item.productId) === String(productIndex)
    );
    persistLocalCart(updatedCart);
    recommendations.track({
      eventType: "quantity_change",
      product: changedItem ? resolveProduct(changedItem) : null,
      productId: changedItem?.productId || String(productIndex),
      quantity: newQuantity,
      metadata: { source: "guest_cart_page" },
    });
    toast.success(t("cart.updated", "Cart updated!"));
  };

  const removeFromCart = async (productIndex: string | number) => {
    if (isAuthenticated) {
      const item = supabaseCartItems.find(
        cartItem => String(cartItem.product_id) === String(productIndex)
      );
      if (!item?.id) {
        toast.error(t("cart.itemNotFound", "Cart item not found"));
        return;
      }
      await removeSupabaseItem(item.id);
      return;
    }

    const removedItem = cartItems.find(
      item =>
        String(item.productIndex) === String(productIndex) ||
        String(item.productId) === String(productIndex)
    );
    const updatedCart = cartItems.filter(
      item => item.productIndex !== productIndex
    );
    persistLocalCart(updatedCart);
    recommendations.track({
      eventType: "remove_from_cart",
      product: removedItem ? resolveProduct(removedItem) : null,
      productId: removedItem?.productId || String(productIndex),
      metadata: { source: "guest_cart_page" },
    });
    toast.success(t("cart.itemRemoved", "Item removed from cart!"));
  };

  // Calculate totals
  const subtotal = effectiveCartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, "") || "0");
    return sum + price * item.quantity;
  }, 0);

  const shipping = calculateShipping(subtotal);
  // Tax is not charged as a separate line - listed prices are tax
  // inclusive, communicated to the shopper instead of itemized.
  const total = subtotal + shipping;

  const shouldShowLoadingState = !loadingTimedOut && isWaitingOnCartData;
  const showCartLoading =
    !loadingTimedOut && (isLoading || shouldShowLoadingState);

  const enrichedCartItems = effectiveCartItems.map(item => {
    const product = resolveProduct(item);
    return {
      ...item,
      productId: item.productId || product?.id,
      stock: product?.stock ?? null,
    };
  });

  // ---- Add-on suggestions --------------------------------------------------
  // Real, in-stock, low-priced catalogue items that are not already in the
  // cart. Cheapest first; the block is hidden when there is nothing suitable.
  const ADD_ON_PRICE_CEILING_USD = 150;
  const cartProductIds = new Set(
    enrichedCartItems.map(item => String(item.productId || ""))
  );
  const addOnProducts = (dbProducts as Product[])
    .filter(product => {
      const price = Number(product.price);
      return (
        Number.isFinite(price) &&
        price > 0 &&
        price <= ADD_ON_PRICE_CEILING_USD &&
        Number(product.stock ?? 0) > 0 &&
        !cartProductIds.has(String(product.id))
      );
    })
    .sort((a, b) => Number(a.price) - Number(b.price))
    .slice(0, 4);

  const handleAddOn = async (product: Product) => {
    setAddingProductId(product.id);
    try {
      // Same cart hook the product page uses (handles guests, stock checks
      // and the confirmation toast).
      const added = await addToCart(product.id, 1);
      if (!added) return;
      trackAddToCart(product.id, product.title, Number(product.price) || 0, 1);
      if (!isAuthenticated) {
        // Guest carts live in localStorage; re-read so the new line shows up.
        setCartItems(readCartFromStorage(localStorage.getItem("cart")));
      }
    } finally {
      setAddingProductId(null);
    }
  };

  const requestSignIn = () => {
    try {
      localStorage.setItem("oauth_return_to", "/cart");
      savePendingAuthAction({
        type: "cart",
        redirectTo: "/cart",
      });
    } catch {
      // ignore storage issues
    }
    window.dispatchEvent(
      new CustomEvent("auth:required", {
        detail: {
          actionType: "cart",
          redirectTo: "/cart",
        },
      })
    );
  };

  const parseItemPrice = (item: CartItem) =>
    parseFloat(item.price.replace(/[^\d.]/g, "") || "0");

  if (!showCartLoading && effectiveCartItems.length === 0) {
    return (
      <div className="container py-10 sm:py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center sm:py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-card">
            <ShoppingCart
              className="h-6 w-6 text-gray-500"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-ink">
            {t("cart.empty", "Your cart is empty")}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-gray-600 sm:text-base">
            {t(
              "cart.startShopping",
              "Start shopping to add items to your cart"
            )}
          </p>

          <Link href="/products" className="btn-primary btn-lg mt-7">
            {t("header.browseProducts", "Browse Products")}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>

          {!isAuthenticated && (
            <div className="mt-8 w-full border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600">
                Sign in to access your account cart and saved items.
              </p>
              <button
                onClick={requestSignIn}
                className="btn-secondary btn-sm mt-3"
              >
                Login to Access Cart
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background">
      <div className="container py-6 sm:py-10">
        <h1 className="text-ink">{t("common.cart", "Shopping Cart")}</h1>

        {!isAuthenticated && (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Sign in to access your account cart and saved items.
            </p>
            <button
              onClick={requestSignIn}
              className="btn-secondary btn-sm flex-none"
            >
              Login to Access Cart
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          {/* Cart Items */}
          <div className="min-w-0">
            <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
              {showCartLoading
                ? [...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 p-4 sm:p-5">
                      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-lg sm:h-24 sm:w-24" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-11/12" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-32 rounded-md" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))
                : enrichedCartItems.map(item => (
                    <div
                      key={item.productId || item.productIndex}
                      className="flex gap-3 p-4 sm:gap-5 sm:p-5"
                    >
                      {/* Product Image */}
                      <Link
                        href={`/product/${item.productId || item.productIndex}`}
                        className="flex-shrink-0"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <ProductImage
                          src={item.image}
                          alt={item.title}
                          compactFallback
                          className="h-20 w-20 rounded-lg sm:h-24 sm:w-24"
                          imgClassName="p-1.5"
                        />
                      </Link>

                      {/* Product Info */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/product/${item.productId || item.productIndex}`}
                            className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:underline hover:underline-offset-2 sm:text-[15px]"
                          >
                            {item.title}
                          </Link>
                          <p className="price flex-none text-sm font-bold text-ink sm:text-base">
                            {formatMoney(parseItemPrice(item) * item.quantity)}
                          </p>
                        </div>
                        <p className="price mt-1 text-[13px] text-gray-600">
                          {formatMoney(parseItemPrice(item))}
                        </p>
                        <p
                          className={`mt-0.5 text-xs font-medium ${item.stock === 0 ? "text-brand" : "text-gray-500"}`}
                        >
                          {item.stock === 0
                            ? "Out of stock"
                            : item.stock != null
                              ? `${item.stock} in stock`
                              : "Stock information unavailable"}
                        </p>

                        {/* Quantity Controls + Remove */}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-md border border-gray-300">
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  item.productIndex,
                                  item.quantity - 1
                                )
                              }
                              className="flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 rounded-l-md text-gray-700 transition-colors hover:bg-gray-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={15} />
                            </button>
                            <span className="price w-9 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  item.productIndex,
                                  item.quantity + 1
                                )
                              }
                              disabled={item.stock === 0}
                              className="flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 rounded-r-md text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productIndex)}
                            className="flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 rounded-md text-gray-500 transition-colors hover:bg-brand-soft hover:text-brand"
                            aria-label="Remove from cart"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>

            {/* Continue Shopping */}
            {!showCartLoading && (
              <Link
                href="/products"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {t("cart.continueShopping", "Continue Shopping")}
              </Link>
            )}
          </div>

          {/* Order Summary */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 className="text-lg font-bold text-ink">
              {t("checkout.orderSummary", "Order Summary")}
            </h2>

            {showCartLoading ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-[52px] w-full rounded-md" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 border-b border-gray-200 pb-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">
                      {t("checkout.subtotal", "Subtotal")}
                    </span>
                    <span className="price font-semibold text-ink">
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">
                      {t("checkout.estimatedShipping", "Estimated shipping")}
                    </span>
                    <span className="price font-semibold text-ink">
                      {shipping === 0
                        ? t("checkout.free", "FREE")
                        : formatMoney(shipping)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <span className="text-base font-bold text-ink">
                    {t("checkout.total", "Total")}
                  </span>
                  <span className="price text-2xl font-bold text-ink">
                    {formatMoney(total)}
                  </span>
                </div>
                <p className="mt-0.5 text-right text-xs text-gray-500">
                  {t("checkout.taxInclusive", "Tax inclusive")}
                </p>

                <button
                  onClick={() => {
                    // Always allow navigating to checkout; inline auth will be shown on the checkout page
                    navigate("/checkout");
                  }}
                  className="btn-accent btn-lg btn-block mt-5"
                >
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  {t("checkout.proceedToCheckout", "Proceed to Checkout")}
                </button>

                <Link href="/products" className="btn-secondary btn-block mt-3">
                  {t("cart.continueShopping", "Continue Shopping")}
                </Link>

                <div className="mt-5 space-y-1.5 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
                  <p>
                    {t(
                      "checkout.shippingEstimateDisclaimer",
                      "Shipping shown is an estimate. Final shipping is confirmed at checkout."
                    )}
                  </p>
                  {shipping > 0 && (
                    <p>
                      {t(
                        "checkout.freeShippingNotice",
                        `Shipping fee is 5% for orders under $${getFreeShippingThresholdUsd().toLocaleString("en-US")}`
                      )}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Add-on suggestions (real catalogue items only) */}
          {!showCartLoading && addOnProducts.length >= 2 && (
            <section className="min-w-0 border-t border-gray-200 pt-8 lg:col-start-1">
              <h2 className="mb-4 text-xl font-bold text-ink">
                {t("cart.addOnsTitle", "Add to your order")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {addOnProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddOn}
                    isAdding={addingProductId === product.id}
                    className="lg:[&:nth-child(4)]:hidden xl:[&:nth-child(4)]:flex"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
