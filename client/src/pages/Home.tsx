import { Link } from "wouter";
import { ArrowUpRight, Package, ScanLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useCategoryCounts } from "@/hooks/useCategoryCounts";
import { useHomeRails } from "@/hooks/useHomeRails";
import { categoryHref as buildCategoryHref } from "@/lib/categoryLinks";
import { formatMoneyCeil } from "@/lib/pricing";
import { SEOHead } from "@/components/SEOHead";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { BannerCarousel } from "@/components/BannerCarousel";
import { ProductRecommendationSection } from "@/components/ProductRecommendationSection";
import { BlootrueWidget } from "@/components/TrustindexWidget";
import { toast } from "sonner";
import { useProducts, useCategories } from "@/hooks/useSupabaseProducts";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSupabaseWishlist } from "@/hooks/useSupabaseCart";
import { useIsMobile } from "@/hooks/useMobile";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { getSizedImageUrl } from "@/lib/images";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Product } from "@/types/supabase";
import { VEHICLES } from "@shared/vehicleContent";

// Loaded when a quick view is first opened: the modal and its dialog code
// were downloaded and parsed on every visit but run on almost none.
const QuickViewModal = lazy(() =>
  import("@/components/QuickViewModal").then(module => ({
    default: module.QuickViewModal,
  }))
);

/** Products at or below this USD price feed the low-price rail. */
const BUDGET_PRICE_CEILING_USD = 50;
/** The rail only appears once there is enough real stock to fill a row. */
const BUDGET_RAIL_MIN_ITEMS = 4;

const helpLinks = [
  {
    href: "/faq",
    eyebrow: "Fitment",
    title: "Will this part fit my vehicle?",
    body: "See VIN and compatibility guidance before you buy.",
  },
  {
    href: "/faq",
    eyebrow: "Part Quality",
    title: "OEM vs aftermarket vs used?",
    body: "Compare options by quality tier, risk, and budget.",
  },
  {
    href: "/faq",
    eyebrow: "Post-Purchase",
    title: "Returns, warranty, and shipping timing",
    body: "Get clarity on what happens after checkout.",
  },
  {
    href: "/blog",
    eyebrow: "Knowledge Hub",
    title: "Read fitment and repair guides",
    body: "Explore VIN, OEM, DPF, ECU, and EV buying playbooks.",
  },
];

type HomeCategory = {
  id: string | number;
  name: string;
  slug?: string | null;
  image_url?: string | null;
};

function categoryHref(cat: HomeCategory) {
  return buildCategoryHref(cat.slug || cat.name || "");
}

/**
 * Category tile. The photo is a hot-linked product shot, so it can fail; the
 * fallback is a plain labelled tile. The category `icon` / `description`
 * columns are deliberately not rendered - several rows hold placeholder text.
 */
function CategoryTile({ category }: { category: HomeCategory }) {
  const [imageFailed, setImageFailed] = useState(false);
  // Tiles are ~185-300px wide; ask the image host for a matching size.
  const imageUrl = getSizedImageUrl(category.image_url, 480);
  const hasImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Link
      href={categoryHref(category)}
      className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-gray-900"
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/30">
          <Package className="h-9 w-9" strokeWidth={1.25} aria-hidden="true" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-white sm:text-[15px]">
          {category.name}
        </span>
        <ArrowUpRight
          className="h-4 w-4 flex-none text-white/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

const homeBannerSlides = [
  {
    image: "/images/banners/european-car-bumper-parts-banner-home.avif",
    imageWebp: "/images/banners/european-car-bumper-parts-banner-home.webp",
    imageAlt:
      "Car bumper replacement parts for collision repair and front-end restoration",
    title: "Built to Bring Front Ends Back",
    subtitle:
      "Rugged bumper parts for repairs, refreshes, and the kind of fitment that keeps cars looking sharp.",
    cta: "Explore bumpers",
    ctaLink: "/products",
  },
  {
    image: "/images/banners/european-car-seat-parts-banner-home.avif",
    imageWebp: "/images/banners/european-car-seat-parts-banner-home.webp",
    imageAlt: "Car interior seat components and upholstery replacement parts",
    title: "Comfort You Can Feel on Every Drive",
    subtitle:
      "Seat components and interior upgrades chosen to restore support, style, and everyday comfort.",
    cta: "Browse seats",
    ctaLink: "/products?category=seats",
  },
  {
    image: "/images/banners/european-car-tire-parts-banner-home.avif",
    imageWebp: "/images/banners/european-car-tire-parts-banner-home.webp",
    imageAlt:
      "Tire and wheel parts focused on road grip and handling performance",
    title: "Grip the Road with Confidence",
    subtitle:
      "A tire-focused showcase for drivers who want dependable traction, better handling, and a stronger road presence.",
    cta: "See tire options",
    ctaLink: "/products",
  },
  {
    image: "/images/banners/european-car-transmission-parts-banner-home.avif",
    imageWebp:
      "/images/banners/european-car-transmission-parts-banner-home.webp",
    imageAlt:
      "Transmission and drivetrain replacement parts for smooth shifting reliability",
    title: "Powertrain Parts That Keep Things Moving",
    subtitle:
      "Transmission-focused parts and support for customers who want smooth shifting and reliable performance.",
    cta: "View driveline parts",
    ctaLink: "/products",
  },
];

export default function Home() {
  const { user } = useAuth();
  const recommendations = useRecommendations(user?.id || null);
  const isMobile = useIsMobile();
  const homepageProductFetchLimit = isMobile ? 24 : 48;
  const { products } = useProducts(1, homepageProductFetchLimit);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(
    user?.id || null
  );
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const categoryCounts = useCategoryCounts();
  const rails = useHomeRails(BUDGET_PRICE_CEILING_USD, 10);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(
    null
  );
  const [showBelowFoldContent, setShowBelowFoldContent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const reveal = () => {
      if (!cancelled) {
        setShowBelowFoldContent(true);
      }
    };

    const onUserIntent = () => reveal();
    window.addEventListener("scroll", onUserIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener("pointerdown", onUserIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", onUserIntent, { once: true });

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(reveal, { timeout: 1400 });
    } else {
      globalThis.setTimeout(reveal, 900);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onUserIntent);
      window.removeEventListener("pointerdown", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
    };
  }, []);

  const recentlyViewedVisibleCount = isMobile ? 6 : 5;
  const recommendationVisibleCount = isMobile ? 6 : 12;

  const { products: recentlyViewedProducts } = useRecentlyViewed(
    recentlyViewedVisibleCount
  );
  const hasRecentlyViewedProducts = recentlyViewedProducts.length > 0;

  const recommendedForYouProducts = useMemo(() => {
    return recommendations.recommendedProducts(
      products || [],
      recommendationVisibleCount
    );
  }, [products, recommendations, recommendationVisibleCount]);

  // Deals rail: only products that are really discounted, ranked by the
  // shopper's profile, and not repeating the "Recommended" rail above it.
  const personalizedDealProducts = useMemo(() => {
    const shownAbove = new Set(recommendedForYouProducts.map(p => p.id));
    const candidates = rails.deals.filter(p => !shownAbove.has(p.id));
    return recommendations
      .personalizedDeals(candidates, candidates.length)
      .filter(p => Number(p.discount) > Number(p.price))
      .slice(0, recommendationVisibleCount);
  }, [
    rails.deals,
    recommendations,
    recommendedForYouProducts,
    recommendationVisibleCount,
  ]);

  // Low-price rail: real, in-stock products under the ceiling, cheapest first.
  const budgetProducts = useMemo(
    () => rails.budget.slice(0, isMobile ? 6 : 10),
    [rails.budget, isMobile]
  );
  const showBudgetRail = budgetProducts.length >= BUDGET_RAIL_MIN_ITEMS;

  const handleRecommendationClick = (source: string, product: Product) => {
    recommendations.track({
      eventType: "recommendation_click",
      product,
      productId: product.id,
      metadata: { source },
    });
  };

  const handleRecommendationQuickView = (source: string, productId: string) => {
    const product = products?.find(
      item => String(item.id) === String(productId)
    );
    if (product) {
      recommendations.track({
        eventType: "product_view",
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
    toast.success(isWished ? "Removed from wishlist" : "Added to wishlist!");
  };

  // Image tiles for the first categories, compact links for the rest, so the
  // section keeps its shape whether there are 8 categories or 30.
  const categoryTileCount = isMobile ? 6 : 12;
  // Most-stocked categories get the tiles (real counts from the catalogue);
  // the hook keeps its alphabetical order as the tie-break.
  const rankedCategories = useMemo(() => {
    const countFor = (name: string | null | undefined) =>
      categoryCounts[
        String(name || "")
          .trim()
          .toLowerCase()
      ] || 0;
    return [...categories].sort((a, b) => countFor(b.name) - countFor(a.name));
  }, [categories, categoryCounts]);
  const tileCategories = useMemo(
    () => rankedCategories.slice(0, categoryTileCount),
    [rankedCategories, categoryTileCount]
  );
  const overflowCategories = useMemo(
    () => rankedCategories.slice(categoryTileCount),
    [rankedCategories, categoryTileCount]
  );

  return (
    <>
      <SEOHead
        pageType="homepage"
        title="MotorVault - Buy Automotive Parts Online | OEM & Aftermarket"
        description="Shop accessories and parts for the Ford F-150, Ram 1500, Chevy Silverado, Toyota Tacoma, Jeep Wrangler and Tesla Model 3 and Y, plus OEM and used parts for Opel, BMW, Audi and Fiat."
        keywords={[
          "automobile parts",
          "car parts",
          "auto parts",
          "aftermarket parts",
          "OEM parts",
          "motor parts online",
        ]}
        canonical="https://motorvault.shop"
      />
      <div className="min-h-screen w-full overflow-x-hidden bg-white">
        {/* Hero Slideshow */}
        <HeroSlideshow />

        {/* Shop by Category */}
        <section className="section bg-white">
          <div className="container">
            <SectionHeader
              title="Shop by Category"
              ctaHref="/products"
              ctaLabel="View all"
            />

            {categoriesLoading && categories.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                {Array.from({ length: categoryTileCount }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-[4/3] w-full rounded-lg"
                  />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                  {tileCategories.map(cat => (
                    <CategoryTile key={cat.id} category={cat} />
                  ))}
                </div>

                {overflowCategories.length > 0 && (
                  <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
                    {overflowCategories.map(cat => (
                      <Link
                        key={cat.id}
                        href={categoryHref(cat)}
                        className="inline-flex min-h-11 flex-none items-center sm:min-h-10 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-gray-50"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
                <p className="text-sm text-gray-600">
                  Categories are on their way. Browse the full catalogue in the
                  meantime.
                </p>
                <Link href="/products" className="btn-secondary btn-sm mt-4">
                  All Products
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Shop by vehicle: one page per popular truck, Jeep and Tesla */}
        <section className="section !pt-0">
          <div className="container">
            <h2 className="text-lg font-bold text-ink sm:text-xl">
              Shop by vehicle
            </h2>
            <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
              {VEHICLES.map(vehicle => (
                <li key={vehicle.slug} className="flex-none">
                  <Link
                    href={`/vehicle/${vehicle.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-gray-50 sm:min-h-10"
                  >
                    {vehicle.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* VIN decoder entry point */}
        <section className="bg-white pb-10 sm:pb-12 lg:pb-14">
          <div className="container">
            <div className="flex flex-col gap-4 rounded-xl bg-gray-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-7">
              <div className="flex min-w-0 items-start gap-4">
                <div className="hidden h-11 w-11 flex-none items-center justify-center rounded-lg bg-white/10 sm:flex">
                  <ScanLine className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold leading-snug sm:text-xl">
                    Not sure it fits? Decode your VIN
                  </h2>
                  <p className="mt-1 text-sm text-white/75 sm:text-[15px]">
                    Check your vehicle's details by VIN before you order.
                  </p>
                </div>
              </div>
              <Link
                href="/vin-decoder"
                className="inline-flex min-h-11 flex-none items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-gray-200"
              >
                VIN Decoder
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {showBelowFoldContent && (
          <>
            {showBudgetRail && (
              <ProductRecommendationSection
                title={
                  <>
                    <span>Under</span>{" "}
                    <span className="price">
                      {formatMoneyCeil(BUDGET_PRICE_CEILING_USD)}
                    </span>
                  </>
                }
                eyebrow="Low-price picks"
                products={budgetProducts}
                wishedProductIds={wishedProductIds}
                onWishlistToggle={handleRecommendationWishlistToggle}
                onQuickView={productId =>
                  handleRecommendationQuickView("home_under_budget", productId)
                }
                onProductClick={product =>
                  handleRecommendationClick("home_under_budget", product)
                }
                onAddToCart={addProduct}
                addingProductId={pendingId}
                ctaHref="/products"
                tone="tint"
              />
            )}

            <ProductRecommendationSection
              title="Recommended For You"
              products={recommendedForYouProducts}
              wishedProductIds={wishedProductIds}
              onWishlistToggle={handleRecommendationWishlistToggle}
              onQuickView={productId =>
                handleRecommendationQuickView(
                  "home_recommended_for_you",
                  productId
                )
              }
              onProductClick={product =>
                handleRecommendationClick("home_recommended_for_you", product)
              }
              onAddToCart={addProduct}
              addingProductId={pendingId}
              ctaHref="/products"
              className={
                showBudgetRail ? undefined : "border-t border-gray-200"
              }
              compact
            />

            <section className="section bg-gray-50">
              <BannerCarousel slides={homeBannerSlides} tone="dark" />
            </section>

            <ProductRecommendationSection
              title="Deals You May Like"
              products={personalizedDealProducts}
              wishedProductIds={wishedProductIds}
              onWishlistToggle={handleRecommendationWishlistToggle}
              onQuickView={productId =>
                handleRecommendationQuickView(
                  "home_personalized_deals",
                  productId
                )
              }
              onProductClick={product =>
                handleRecommendationClick("home_personalized_deals", product)
              }
              onAddToCart={addProduct}
              addingProductId={pendingId}
              ctaHref="/products"
              ctaLabel="Shop deals"
              compact
            />

            {/* Your Recently Viewed Items Section */}
            {hasRecentlyViewedProducts && (
              <ProductRecommendationSection
                title="Your Recently Viewed"
                products={recentlyViewedProducts}
                wishedProductIds={wishedProductIds}
                onWishlistToggle={handleRecommendationWishlistToggle}
                onQuickView={productId => setQuickViewProductId(productId)}
                onAddToCart={addProduct}
                addingProductId={pendingId}
                ctaHref="/products"
                className="border-t border-gray-200"
                compact
              />
            )}
          </>
        )}

        {/* What the store is, in plain words, for visitors and crawlers */}
        <section className="section !pt-0">
          <div className="container">
            <h2 className="text-lg font-bold text-ink sm:text-xl">
              What MotorVault sells
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
              MotorVault is an online auto parts and accessories store. Most of
              the catalogue is accessories and parts for trucks, Jeeps and
              Teslas, including the Ford F-150, Ram 1500, Chevy Silverado,
              Toyota Tacoma, Jeep Wrangler and Tesla Model 3 and Model Y,
              alongside lighting, towing gear and car care. We also list OEM and
              used parts for European makes such as Opel, BMW, Audi and Fiat.
              Every listing states the model years it fits, and you can check
              your vehicle with the free{" "}
              <Link href="/vin-decoder" className="underline">
                VIN decoder
              </Link>{" "}
              before you order.
            </p>
          </div>
        </section>

        {/* Reviews */}
        <section className="section border-t border-gray-200 bg-gray-50">
          <div className="container">
            <SectionHeader
              eyebrow="Trusted Reviews"
              title="Why buyers trust our fitment-first approach"
            />
            <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-4">
              <BlootrueWidget />
            </div>
          </div>
        </section>

        {/* Buying help */}
        <section className="section bg-white">
          <div className="container">
            <div className="grid gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 sm:grid-cols-2 xl:grid-cols-4">
              {helpLinks.map(item => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex flex-col bg-white p-5 transition-colors hover:bg-gray-50 sm:p-6"
                >
                  <p className="eyebrow">{item.eyebrow}</p>
                  <h3 className="mt-2 text-base font-semibold leading-snug text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600">{item.body}</p>
                  <ArrowUpRight
                    className="mt-4 h-4 w-4 text-gray-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {showBelowFoldContent && quickViewProductId && (
          <Suspense fallback={null}>
            <QuickViewModal
              productId={quickViewProductId}
              isOpen={!!quickViewProductId}
              onClose={() => setQuickViewProductId(null)}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}
