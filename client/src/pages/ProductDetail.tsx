import { useRoute, useLocation } from "wouter";
import {
  ShoppingCart,
  Heart,
  Truck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Zap,
  ArrowLeft,
  MessageCircle,
  CircleAlert,
  ScanLine,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  useCategories,
  useProductById,
  useProducts,
} from "@/hooks/useSupabaseProducts";
import { categoryHrefFor } from "@/lib/categoryLinks";
import { vehiclesMatchingTitle } from "@shared/vehicleContent";
import { useSupabaseCart, useSupabaseWishlist } from "@/hooks/useSupabaseCart";
import { useState, useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import currencyClient from "@/lib/currencyClient";
import { getHighResImageUrl } from "@/lib/images";
import { trackAddToCart, trackViewContent } from "@/hooks/useMetaPixel";
import { ProductRecommendationSection } from "@/components/ProductRecommendationSection";
import { ProductImage } from "@/components/ProductImage";
import { ShareButton } from "@/components/ShareButton";
import { PRODUCT_GRID_CLASS, ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { formatMoney } from "@/lib/pricing";
import { BlootrueWidget } from "@/components/TrustindexWidget";
import { useRecommendations } from "@/hooks/useRecommendations";
import { recordRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { buildContactHref, getEnquiryCopy } from "@/lib/enquiry";
import { getSiteLanguage } from "@/lib/language";
import { useSsrProductData } from "@/lib/ssrProductData";
import { buildOfferPolicies } from "@/lib/schemaBuilders";
import {
  buildProductMetaDescription,
  buildProductSeoTitle,
} from "@/lib/productSeo";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
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
  const { product, images, isLoading, error } = useProductById(productId || "");
  const { categories } = useCategories();
  const ssrProduct = useSsrProductData();
  const { products: allProducts } = useProducts(1, 200); // Fetch products for similar items
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(
    user?.id || null
  );
  const recommendations = useRecommendations(user?.id || null);
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);
  const lastTrackedProductViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!product?.id) return;
    trackViewContent(product.id, product.title, Number(product.price) || 0);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id || lastTrackedProductViewRef.current === product.id)
      return;
    lastTrackedProductViewRef.current = product.id;
    recommendations.track({
      eventType: "product_view",
      product,
      productId: product.id,
      metadata: { source: "product_detail" },
    });
  }, [product?.id, recommendations.track]);

  // Lightweight non-blocking tracker helper (same pattern as Products.tsx)
  const sendTrackingEvent = (payload: Record<string, any>) => {
    try {
      // Ensure a persistent session id exists for anonymous users
      try {
        if (typeof window !== "undefined") {
          let sid = localStorage.getItem("sessionId");
          if (!sid) {
            sid =
              typeof crypto !== "undefined" && (crypto as any).randomUUID
                ? (crypto as any).randomUUID()
                : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            try {
              localStorage.setItem("sessionId", sid || "");
            } catch {}
          }
          payload.sessionId = payload.sessionId || sid;
        }
      } catch {}

      const body = JSON.stringify(payload);
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([body], { type: "application/json" })
        );
        return;
      }
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch (err) {
      // ignore
    }
  };

  const hasSearchSession = () => {
    try {
      const active = sessionStorage.getItem("activeSearchTerm");
      const pending = sessionStorage.getItem("pendingSearchTerm");
      return Boolean(active || pending);
    } catch (e) {
      return false;
    }
  };

  // Combine cover image with product images
  const allImages: Array<{ id: string; image_url: string }> =
    product?.cover_image_url
      ? [{ id: "cover", image_url: product.cover_image_url }, ...(images || [])]
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
      if (e.key === "Escape") setShowLightbox(false);
      if (e.key === "ArrowLeft") setSelectedImage(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setSelectedImage(i => Math.min(allImages.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLightbox, allImages.length]);

  // Handle drag for panning on mouse and touch devices
  // Panning only applies once zoomed in. At 1x the photo must not swallow
  // touches, otherwise a phone cannot scroll the page past it.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
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
    if (!touch || zoom <= 1) return;
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
        const newZoom = Math.min(
          Math.max(zoom - e.deltaY * 0.001 * zoomSpeed, 1),
          3
        );
        setZoom(newZoom);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error("This item is out of stock");
      return;
    }

    // Allow guest users to add to local cart; use addToCart hook which supports guest localStorage

    if (!product?.id) {
      toast.error("Product information is missing");
      return;
    }

    try {
      const added = await addToCart(product.id, quantity);

      if (!added) {
        return;
      }
      trackAddToCart(
        product.id,
        product.title,
        Number(product.price) || 0,
        quantity
      );
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
      try {
        if (hasSearchSession()) {
          sendTrackingEvent({
            sessionId:
              typeof window !== "undefined"
                ? localStorage.getItem("sessionId") || ""
                : "",
            eventType: "product_click",
            clickedProductId: product.id,
            action: "add_to_cart",
            pageUrl: window.location.href,
            matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
          });
        }
      } catch {}
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      toast.error(
        "This item is out of stock. Please contact support for more information."
      );
      return;
    }

    // Allow guest users to add to cart then navigate to checkout (Inline auth appears there)

    try {
      if (!product?.id) {
        toast.error("Product information is missing");
        return;
      }
      const added = await addToCart(product.id, quantity);
      if (!added) {
        return;
      }
      try {
        if (hasSearchSession()) {
          sendTrackingEvent({
            sessionId:
              typeof window !== "undefined"
                ? localStorage.getItem("sessionId") || ""
                : "",
            eventType: "product_click",
            clickedProductId: product.id,
            action: "buy_now",
            pageUrl: window.location.href,
            matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
          });
        }
      } catch {}
      navigate("/checkout");
    } catch (error) {
      toast.error("Failed to proceed to checkout");
    }
  };

  const handleWishlistClick = async () => {
    if (product?.id) {
      try {
        await toggleWishlist(product.id);
      } catch {}
    }
  };

  // Track recently viewed items in localStorage
  useEffect(() => {
    if (product?.id) recordRecentlyViewed(String(product.id));
  }, [product?.id]);

  // Smooth handling when product lookup returns no result
  useEffect(() => {
    if (!isLoading && productId && !product) {
      toast.error("Product not found. Redirecting to products.");
      setTimeout(() => navigate("/products"), 1400);
    }
  }, [isLoading, productId, product, navigate]);

  const similarVehicleProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.similarVehicleParts(
      allProducts || [],
      product,
      isMobile ? 6 : 12
    );
  }, [allProducts, isMobile, product, recommendations]);

  const completeRepairProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.completeRepairProducts(
      allProducts || [],
      product,
      isMobile ? 6 : 12
    );
  }, [allProducts, isMobile, product, recommendations]);

  const frequentlyBoughtTogetherProducts = useMemo(() => {
    if (!product) return [];
    return recommendations.frequentlyBoughtTogetherProducts(
      allProducts || [],
      product,
      isMobile ? 6 : 12
    );
  }, [allProducts, isMobile, product, recommendations]);

  if (!productId) return null;

  const canonicalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/product/${productId}`
      : `/product/${productId}`;
  // product only settles after useProductById's client-side fetch, which
  // never runs during SSR - ssrProduct is a lightweight server-only
  // prefetch (see entry-server.tsx) used just to give each product page
  // its own title/description before that fetch has happened. It only
  // affects these SEOHead values, never the actual rendered content.
  const seoProduct = product || ssrProduct;
  // Some catalog titles carry stray leading/trailing whitespace or
  // newlines from the original listing data - trim before it ends up in
  // a <title> tag or meta description.
  const seoProductTitle = seoProduct?.title?.replace(/\s+/g, " ").trim();
  const seoTitle = seoProductTitle
    ? buildProductSeoTitle(seoProductTitle)
    : "Product Details | MotorVault";
  const seoDescription = seoProductTitle
    ? buildProductMetaDescription({
        title: seoProductTitle,
        condition: (product || ssrProduct)?.condition,
        itemSpecifics: (product || ssrProduct)?.item_specifics,
      })
    : "View premium automotive parts and accessories on MotorVault.";
  const seoImage =
    product?.cover_image_url ||
    images?.[0]?.image_url ||
    ssrProduct?.cover_image_url ||
    "https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp";
  const seoKeywords = [
    "automotive parts",
    "car parts",
    "OEM parts",
    "aftermarket parts",
    seoProduct?.brand,
    seoProduct?.model,
    seoProduct?.category_name,
  ].filter((value): value is string => Boolean(value && value.trim()));
  // Minimal Product schema from the SSR-only prefetch, so a crawler that
  // only ever sees the loading-state render (i.e. any crawler, since the
  // real fetch only happens client-side) still gets rich-result-eligible
  // markup instead of none at all.
  const seoProductData = seoProduct
    ? {
        name: seoProductTitle || seoProduct.title,
        price: seoProduct.price ?? "",
        image: seoImage,
        category: seoProduct.category_name || undefined,
        description: ssrProduct?.item_specifics || undefined,
        sku: seoProduct.part_number || undefined,
        brand: seoProduct.brand || undefined,
        mpn: seoProduct.part_number || undefined,
        url: canonicalUrl,
        ...buildOfferPolicies(Number(seoProduct.price) || 0),
      }
    : undefined;

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
          productData={seoProductData}
        />
        <main
          role="main"
          className="min-h-screen w-full overflow-x-clip bg-white"
        >
          <div className="container py-5 sm:py-8">
            <Skeleton className="h-4 w-64" />
            {/* The product name is known before the full record loads (the
                server prefetches it), so crawlers get a real H1. */}
            {seoProductTitle ? (
              <h1 className="mt-4 text-2xl font-bold leading-tight text-ink sm:text-[1.75rem]">
                {seoProductTitle}
              </h1>
            ) : null}

            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
              <section className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl sm:aspect-[4/3] lg:aspect-square" />
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-16 w-16 rounded-md" />
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-5/6" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-[52px] w-full rounded-md" />
                <Skeleton className="h-[52px] w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </section>
            </div>

            <div className="mt-12 space-y-4 border-t border-gray-200 pt-10">
              <Skeleton className="h-7 w-56" />
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/*
          A missing or invalid product id must not look like a real product
          page. Without noIndex this renders 200 + "index, follow" carrying
          product schema for a product that is not there - a soft 404 that
          lets every bad id become an indexable empty page.
        */}
        <SEOHead
          title="Product Not Available | MotorVault"
          description="This product is no longer available. Browse our catalogue of European car parts."
          canonical={canonicalUrl}
          noIndex
          ogType="product"
          ogImage={seoImage}
          keywords={seoKeywords}
        />
        <div className="container py-16 sm:py-24">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
              <CircleAlert className="h-6 w-6 text-brand" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-semibold text-ink">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
              <Link href="/products" className="btn-secondary">
                All Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!product) return null;

  const currentPrice = Number(product.price);
  const originalPrice = product.original_price
    ? Number(product.original_price)
    : null;

  // Use centralized currency client (initialized at app bootstrap)
  // Always show USD for African users (enforced in currencyClient)
  const currencyCode = currencyClient.getCurrencyCode();
  const formatPrice = formatMoney;

  // Calculate accurate discount percentage and local discount amount
  let discountPercentage = 0;
  let discountAmount = 0;

  if (product.discount && Number(product.discount) > currentPrice) {
    const discountValue = Number(product.discount);
    // Kept in USD; formatMoney converts to the visitor currency on display.
    discountAmount = discountValue - currentPrice;
    discountPercentage = Math.round(
      ((discountValue - currentPrice) / discountValue) * 100
    );
  }

  const stock = Number(product.stock ?? 0);
  const isOutOfStock = stock === 0;
  const isWishlisted = product.id && wishedProductIds.has(product.id);

  const productDescription =
    typeof product.item_specifics === "string"
      ? product.item_specifics.trim()
      : product.item_specifics && typeof product.item_specifics === "object"
        ? JSON.stringify(product.item_specifics, null, 2)
        : "";
  const schemaPrice = currencyClient.isAfricanUser()
    ? currentPrice
    : currencyClient.convertUSD(currentPrice);
  const schemaCurrencyCode = currencyClient.isAfricanUser()
    ? "USD"
    : currencyCode || "USD";
  const productSchemaImages = allImages
    .map(image => getHighResImageUrl(image.image_url))
    .filter((image): image is string => Boolean(image));
  const productSchemaDescription =
    productDescription || product.title || seoDescription;
  const productSchemaSku = product.part_number || String(product.id);
  // Slug form, so product pages link to the one canonical category URL.
  const productCategoryUrl = categoryHrefFor(categories, product.category_name);
  // The vehicle pages that list this product (matched on its title).
  const productVehicles = vehiclesMatchingTitle(product.title);
  const productBreadcrumbSchema = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    ...(product.category_name
      ? [{ name: product.category_name, url: productCategoryUrl }]
      : []),
    { name: product.title, url: canonicalUrl },
  ];
  const productBreadcrumbItems = [
    { label: "Products", href: "/products" },
    ...(product.category_name
      ? [{ label: product.category_name, href: productCategoryUrl }]
      : []),
    { label: product.title, href: canonicalUrl },
  ];

  const getEnquiryContactUrl = (outOfStockOnly: boolean = false) => {
    const enquiryCopy = getEnquiryCopy(getSiteLanguage());
    const params = new URLSearchParams();
    const subjectPrefix = outOfStockOnly
      ? enquiryCopy.outOfStockSubject
      : enquiryCopy.productSubject;
    const subject = `${subjectPrefix} - ${product.title}`;

    const lines = [
      "Hello Support,",
      "",
      outOfStockOnly
        ? enquiryCopy.outOfStockLine(product.title)
        : enquiryCopy.productEnquiryLine(product.title),
      "",
      `${enquiryCopy.productLabel}: ${product.title}`,
      product.part_number
        ? `${enquiryCopy.partNumberLabel}: ${product.part_number}`
        : "",
      product.brand ? `${enquiryCopy.brandLabel}: ${product.brand}` : "",
      product.model ? `${enquiryCopy.modelLabel}: ${product.model}` : "",
      product.category_name
        ? `${enquiryCopy.categoryLabel}: ${product.category_name}`
        : "",
      Number.isFinite(Number(product.price))
        ? `${enquiryCopy.priceLabel}: ${Number(product.price).toFixed(2)}`
        : "",
      `${enquiryCopy.productLinkLabel}: ${window.location.origin}/product/${product.id}`,
      "",
      outOfStockOnly
        ? enquiryCopy.productOutOfStockAsk
        : enquiryCopy.productGeneralAsk,
    ].filter(Boolean);

    params.set("subject", subject);
    params.set("message", lines.join("\n"));
    params.set("product", product.title);
    params.set("productId", String(product.id));

    if (typeof user?.name === "string" && user.name.trim()) {
      params.set("name", user.name.trim());
    }
    if (typeof user?.email === "string" && user.email.trim()) {
      params.set("email", user.email.trim());
    }

    const userLocation =
      typeof (user as any)?.location === "string"
        ? (user as any).location
        : typeof (user as any)?.country === "string"
          ? (user as any).country
          : "";

    if (userLocation.trim()) {
      params.set("location", userLocation.trim().toLowerCase());
    }

    return buildContactHref(params);
  };

  const handleEnquireItem = () => {
    try {
      if (hasSearchSession()) {
        sendTrackingEvent({
          sessionId:
            typeof window !== "undefined"
              ? localStorage.getItem("sessionId") || ""
              : "",
          eventType: "product_click",
          clickedProductId: product?.id,
          action: "enquire",
          pageUrl: window.location.href,
          matchedProductIds: (allProducts || []).slice(0, 50).map(p => p.id),
        });
      }
    } catch {}
    navigate(getEnquiryContactUrl(false));
  };

  const fallbackSimilarProducts = allProducts
    .filter(
      p => p.id !== product?.id && p.category_name === product?.category_name
    )
    .slice(0, isMobile ? 6 : 12);
  const similarProducts = (
    similarVehicleProducts.length > 0
      ? similarVehicleProducts
      : fallbackSimilarProducts
  ).slice(0, isMobile ? 6 : 12);

  const handleRecommendationClick = (
    source: string,
    recommendedProduct: typeof product
  ) => {
    recommendations.track({
      eventType: "recommendation_click",
      product: recommendedProduct,
      productId: recommendedProduct.id,
      metadata: { source },
    });
  };

  return (
    <>
      <SEOHead
        pageType="product"
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
          availability: isOutOfStock ? "OutOfStock" : "InStock",
          image:
            productSchemaImages.length > 0 ? productSchemaImages : seoImage,
          category: product.category_name || undefined,
          description: productSchemaDescription,
          sku: productSchemaSku,
          brand: product.brand || undefined,
          mpn: product.part_number || undefined,
          url: canonicalUrl,
          condition: product.condition || undefined,
          ...buildOfferPolicies(currentPrice),
        }}
        breadcrumbs={productBreadcrumbSchema}
      />
      <main
        role="main"
        className={`min-h-screen w-full overflow-x-clip bg-white ${isOutOfStock ? "" : "pb-20 lg:pb-0"}`}
      >
        <div className="container py-5 sm:py-8">
          <Breadcrumb
            items={productBreadcrumbItems}
            includeStructuredData={false}
          />
          {/* Product Detail Grid */}
          {/* Phones: title and price first, then the gallery, then the buy
              box - so what the item is and what it costs are on the first
              screen. Desktop: gallery on the left spanning both rows, title
              and buy box stacked on the right. */}
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-x-12 lg:gap-y-6">
            {/* RIGHT COLUMN (upper) - what it is and what it costs */}
            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              {(product.brand || product.category_name) && (
                <p className="eyebrow">
                  {[product.brand, product.category_name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {/* Title */}
              <h1 className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-[1.75rem]">
                {product.title}
              </h1>

              {(product.condition || product.part_number) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {product.condition && (
                    <span className="rounded-full border border-gray-300 px-2.5 py-1 font-medium capitalize text-gray-700">
                      {product.condition}
                    </span>
                  )}
                  {product.part_number && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-gray-700">
                      {product.part_number}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="mt-5 border-t border-gray-200 pt-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="price text-3xl font-bold leading-none text-ink sm:text-4xl">
                    {formatPrice(currentPrice)}
                  </p>
                  {product.discount &&
                    Number(product.discount) > currentPrice && (
                      <p className="price text-lg text-gray-500 line-through">
                        {formatPrice(Number(product.discount))}
                      </p>
                    )}
                </div>
                {discountPercentage > 0 && discountAmount > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand">
                    <span>You save</span>
                    <span className="price">
                      {formatPrice(discountAmount)} ({discountPercentage}%)
                    </span>
                  </p>
                )}
                <div
                  className={`mt-3 flex items-center gap-2 text-sm font-medium ${isOutOfStock ? "text-brand" : "text-success"}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isOutOfStock ? "bg-brand" : "bg-success"}`}
                    aria-hidden="true"
                  />
                  {isOutOfStock ? "Out of stock" : `${stock} in stock`}
                </div>
                {/* Converted prices are indicative; only say so when converting. */}
                {currencyCode && currencyCode !== "USD" && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    (Estimated Price)
                  </p>
                )}
              </div>
            </div>

            {/* LEFT COLUMN - Image Gallery */}
            <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              {/* Main Image */}
              <div
                className="relative overflow-hidden rounded-xl border border-gray-200 bg-well"
                ref={imageContainerRef}
              >
                {allImages &&
                allImages.length > 0 &&
                allImages[selectedImage] ? (
                  <>
                    <div
                      className="relative flex aspect-square items-center justify-center overflow-hidden sm:aspect-[4/3] lg:aspect-square"
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
                      style={{
                        cursor:
                          zoom > 1
                            ? isDragging
                              ? "grabbing"
                              : "grab"
                            : "zoom-in",
                        touchAction: zoom > 1 ? "none" : "pan-y",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      <img
                        key={`main-${selectedImage}`}
                        src={getHighResImageUrl(
                          allImages[selectedImage].image_url
                        )}
                        alt={`${product.title}`}
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-center p-3 mix-blend-multiply transition-none will-change-transform sm:p-5"
                        style={{
                          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                          transformOrigin: "center center",
                          backfaceVisibility: "hidden",
                        }}
                        onError={e => {
                          e.currentTarget.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f4f4f2" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23a1a19c"%3EPhoto unavailable%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>

                    {discountPercentage > 0 && (
                      <span className="price pointer-events-none absolute left-3 top-3 rounded bg-brand px-2 py-1 text-xs font-bold text-white">
                        -{discountPercentage}%
                      </span>
                    )}

                    {/* Zoom Controls - mouse users only; touch screens pinch */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur-sm [@media(hover:none)]:hidden">
                      <button
                        onClick={() => setZoom(Math.max(zoom - 0.2, 1))}
                        disabled={zoom <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom out"
                        title="Zoom out"
                      >
                        <ZoomOut size={16} className="text-gray-700" />
                      </button>
                      <div className="price min-w-10 text-center text-xs font-medium text-gray-700">
                        {Math.round(zoom * 100)}%
                      </div>
                      <button
                        onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                        disabled={zoom >= 3}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom in"
                        title="Zoom in"
                      >
                        <ZoomIn size={16} className="text-gray-700" />
                      </button>
                    </div>

                    {selectedImage > 0 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage - 1)}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition-colors hover:bg-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={20} className="text-gray-700" />
                      </button>
                    )}
                    {selectedImage < allImages.length - 1 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage + 1)}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition-colors hover:bg-white"
                        aria-label="Next image"
                      >
                        <ChevronRight size={20} className="text-gray-700" />
                      </button>
                    )}
                  </>
                ) : (
                  <ProductImage
                    src={null}
                    alt={product.title}
                    className="aspect-square w-full sm:aspect-[4/3] lg:aspect-square"
                  />
                )}
              </div>

              {/* Thumbnail Gallery */}
              {allImages && allImages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {(() => {
                    const windowSize = 6; // always show up to 6 thumbnails on both mobile and desktop
                    const startIdx = Math.max(
                      0,
                      Math.min(selectedImage, allImages.length - windowSize)
                    );
                    const imagesToShow = allImages.slice(
                      startIdx,
                      startIdx + windowSize
                    );

                    return imagesToShow.map((img, idx) => {
                      const actualImageIndex = startIdx + idx;
                      const isSelected = selectedImage === actualImageIndex;
                      return (
                        <button
                          key={img.id || idx}
                          onClick={() => setSelectedImage(actualImageIndex)}
                          aria-label={`Product image ${actualImageIndex + 1}`}
                          aria-current={isSelected ? "true" : undefined}
                          className={`relative h-16 w-16 flex-none overflow-hidden rounded-md border transition-colors sm:h-20 sm:w-20 ${
                            isSelected
                              ? "border-ink ring-1 ring-ink"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <ProductImage
                            src={img.image_url}
                            alt=""
                            compactFallback
                            className="h-full w-full"
                            imgClassName="p-1"
                          />
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Lightbox Modal */}
            {showLightbox && allImages && allImages.length > 0 && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 px-4"
                onClick={() => setShowLightbox(false)}
              >
                <button
                  className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={() => setShowLightbox(false)}
                  aria-label="Close"
                >
                  <X size={22} />
                </button>

                <button
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(i => Math.max(0, i - 1));
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex max-h-[95vh] max-w-[95vw] items-center justify-center">
                  <img
                    src={getHighResImageUrl(allImages[selectedImage].image_url)}
                    alt={product?.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[92vh] max-w-full object-contain"
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                <button
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(i =>
                      Math.min(allImages.length - 1, i + 1)
                    );
                  }}
                  aria-label="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            {/* RIGHT COLUMN (lower) - buy box */}
            <div className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2">
              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {/* Add to Cart & Wishlist Row */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className="btn-accent btn-lg flex-1"
                  >
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <button
                    onClick={handleWishlistClick}
                    aria-label={
                      isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                    }
                    aria-pressed={Boolean(isWishlisted)}
                    className={`flex h-[3.25rem] w-[3.25rem] flex-none items-center justify-center rounded-md border transition-colors ${
                      isWishlisted
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-gray-300 bg-white text-gray-500 hover:border-ink hover:text-ink"
                    }`}
                  >
                    <Heart
                      className="h-5 w-5"
                      fill={isWishlisted ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                {/* Quick Purchase Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="btn-primary btn-lg btn-block"
                >
                  {!isOutOfStock && (
                    <Zap className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isOutOfStock ? "Out of Stock" : "Quick Purchase"}
                </button>

                <div className="flex gap-3">
                  {/* Continue Shopping Button */}
                  <button
                    onClick={() => navigate("/products")}
                    className="btn-ghost flex-1 px-3"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Continue Shopping
                  </button>

                  {/* Enquire About Item */}
                  <button
                    onClick={handleEnquireItem}
                    className="btn-secondary flex-1 px-3"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Enquire
                  </button>
                </div>

                {/* Out of Stock Message */}
                {isOutOfStock && (
                  <div className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <CircleAlert
                      className="mt-0.5 h-5 w-5 flex-none text-brand"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-gray-700">
                      This item is currently out of stock. Please{" "}
                      <a
                        href={getEnquiryContactUrl(true)}
                        className="font-semibold text-ink underline underline-offset-2"
                      >
                        contact support
                      </a>{" "}
                      for availability information.
                    </p>
                  </div>
                )}
              </div>

              {productVehicles.length > 0 && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  More for your vehicle:{" "}
                  {productVehicles.map((vehicle, index) => (
                    <span key={vehicle.slug}>
                      {index > 0 && ", "}
                      <Link
                        href={`/vehicle/${vehicle.slug}`}
                        className="font-medium text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                      >
                        {vehicle.name} parts
                      </Link>
                    </span>
                  ))}
                </p>
              )}

              <Link
                href="/vin-decoder"
                className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
              >
                <ScanLine className="h-4 w-4 flex-none" aria-hidden="true" />
                Not sure it fits? Decode your VIN
              </Link>
              <ShareButton
                title={product.title}
                url={`/product/${product.id}`}
                className="ml-2"
              />

              {/* Shipping Info */}
              <div className="mt-3 rounded-lg border border-gray-200 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Truck
                    size={18}
                    className="text-gray-500"
                    aria-hidden="true"
                  />
                  Reliable Worldwide Shipping
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <img
                    src="data:image/png;base64,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"
                    alt="FedEx"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="data:image/jpeg;base64,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"
                    alt="UPS"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="data:image/png;base64,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"
                    alt="DHL"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="data:image/png;base64,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"
                    alt="PostNL"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Section - Below Image */}
          <div className="mt-12 grid gap-10 border-t border-gray-200 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
            {/* Key Specifications */}
            <section aria-labelledby="pdp-specs">
              <h2 id="pdp-specs" className="text-xl font-bold text-ink">
                Key Specifications
              </h2>
              <dl className="mt-4 divide-y divide-gray-200 border-y border-gray-200 text-sm">
                {product.condition && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Condition</dt>
                    <dd className="font-medium capitalize text-ink">
                      {product.condition}
                    </dd>
                  </div>
                )}
                {product.category_name && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium text-ink">
                      <Link
                        href={productCategoryUrl}
                        className="underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                      >
                        {product.category_name}
                      </Link>
                    </dd>
                  </div>
                )}
                {product.brand && (
                  <div className="grid grid-cols-[9rem_1fr] items-center gap-4 py-3">
                    <dt className="text-gray-500">Brand</dt>
                    <dd className="flex items-center gap-2.5 font-medium text-ink">
                      {product.brand_details?.image_url && (
                        <img
                          src={product.brand_details.image_url}
                          alt=""
                          loading="lazy"
                          className="h-6 w-6 object-contain"
                        />
                      )}
                      <span>{product.brand}</span>
                    </dd>
                  </div>
                )}
                {product.model && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Model</dt>
                    <dd className="font-medium text-ink">{product.model}</dd>
                  </div>
                )}
                {product.part_number && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Part Number</dt>
                    <dd className="break-all font-mono font-medium text-ink">
                      {product.part_number}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                  <dt className="text-gray-500">Stock Status</dt>
                  <dd
                    className={`font-medium ${isOutOfStock ? "text-brand" : "text-success"}`}
                  >
                    {isOutOfStock ? "Out of stock" : "In Stock"}
                  </dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                  <dt className="text-gray-500">Availability</dt>
                  <dd className="font-medium text-ink">
                    {isOutOfStock ? "Unavailable" : "Ready to Ship"}
                  </dd>
                </div>
                {product.stock !== null && product.stock !== undefined && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Units Available:</dt>
                    <dd className="price font-medium text-ink">
                      {product.stock}
                    </dd>
                  </div>
                )}
                {product.created_at && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="text-gray-500">Listed on:</dt>
                    <dd className="font-medium text-ink">
                      {new Date(product.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Product Description */}
            <section aria-labelledby="pdp-description">
              <h2 id="pdp-description" className="text-xl font-bold text-ink">
                Product Description
              </h2>
              <div className="mt-4">
                {productDescription ? (
                  <p className="whitespace-pre-line break-words text-[15px] leading-7 text-gray-700">
                    {productDescription}
                  </p>
                ) : (
                  <p className="text-[15px] text-gray-500">
                    No product description available.
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <p className="eyebrow">Before you buy</p>
                <p className="mt-2 text-sm text-gray-700 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:decoration-gray-300 [&_a]:underline-offset-4 hover:[&_a]:decoration-ink">
                  Browse more in{" "}
                  <a href={productCategoryUrl}>
                    {product?.category_name || "this category"} parts
                  </a>
                  , verify compatibility in the{" "}
                  <a href="/faq">fitment and part-quality FAQ</a>, check{" "}
                  <a href="/shipping">
                    shipping delivery timelines for auto parts
                  </a>
                  , and review <a href="/returns">returns and warranty terms</a>{" "}
                  before purchase.
                </p>
              </div>
            </section>
          </div>

          {/* Review widget for high-intent shoppers */}
          <section className="mt-12 border-t border-gray-200 pt-10">
            <h2 className="mb-4 text-xl font-bold text-ink">
              Customer feedback
            </h2>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 sm:p-4">
              <BlootrueWidget />
            </div>
          </section>

          {/* Similar Items Section */}
          {similarProducts.length > 0 && (
            <section className="mt-12 border-t border-gray-200 pt-10">
              <SectionHeader
                title="Similar Vehicle Parts"
                ctaHref={productCategoryUrl}
                ctaLabel="See all"
              />

              <div
                className={`${PRODUCT_GRID_CLASS} xl:[&>*:nth-child(n+11)]:hidden`}
              >
                {similarProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isWished={Boolean(p.id && wishedProductIds.has(p.id))}
                    onWishlistToggle={async item => {
                      try {
                        await toggleWishlist(item.id);
                      } catch {}
                    }}
                    onAddToCart={addProduct}
                    isAdding={pendingId === p.id}
                    onNavigate={item => {
                      handleRecommendationClick(
                        "product_detail_similar_vehicle",
                        item
                      );
                      try {
                        if (hasSearchSession()) {
                          sendTrackingEvent({
                            sessionId:
                              typeof window !== "undefined"
                                ? localStorage.getItem("sessionId") || ""
                                : "",
                            eventType: "product_click",
                            clickedProductId: item.id,
                            action: "similar_click",
                            pageUrl: window.location.href,
                            matchedProductIds: (allProducts || [])
                              .slice(0, 50)
                              .map(pp => pp.id),
                          });
                        }
                      } catch {}
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="mt-12">
          <ProductRecommendationSection
            title="Complete The Repair"
            products={completeRepairProducts}
            wishedProductIds={wishedProductIds}
            onWishlistToggle={async recommendedProduct => {
              await toggleWishlist(recommendedProduct.id);
            }}
            onProductClick={recommendedProduct =>
              handleRecommendationClick(
                "product_detail_complete_repair",
                recommendedProduct
              )
            }
            onAddToCart={addProduct}
            addingProductId={pendingId}
            ctaHref={productCategoryUrl}
            tone="tint"
            compact
          />
          <ProductRecommendationSection
            title="Frequently Bought Together"
            products={frequentlyBoughtTogetherProducts}
            wishedProductIds={wishedProductIds}
            onWishlistToggle={async recommendedProduct => {
              await toggleWishlist(recommendedProduct.id);
            }}
            onProductClick={recommendedProduct =>
              handleRecommendationClick(
                "product_detail_bought_together",
                recommendedProduct
              )
            }
            onAddToCart={addProduct}
            addingProductId={pendingId}
            ctaHref="/products"
            compact
          />
        </div>

        {/* Mobile buy bar: price and the primary action stay in reach */}
        {!isOutOfStock && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="container flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="price text-lg font-bold leading-tight text-ink">
                  {formatPrice(currentPrice)}
                </p>
                {discountPercentage > 0 && (
                  <p className="price text-xs text-gray-500 line-through">
                    {formatPrice(Number(product.discount))}
                  </p>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                className="btn-accent flex-[1.4]"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
