// ...existing code...
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import currencyClient from "@/lib/currencyClient";
import { useLocation, useSearch } from "wouter";
import { Link } from "wouter";
import {
  ScanLine,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickViewModal } from "@/components/QuickViewModal";
import { getCategoryContent } from "@shared/categoryContent";
import { getGuidesForCategory } from "@shared/guideLinks";
import { VEHICLES, vehiclesMatchingTitle } from "@shared/vehicleContent";
import { RelatedLinks } from "@/components/RelatedLinks";
import { BrandFilter } from "@/components/BrandFilter";
import {
  useProducts,
  useCategories,
  useProductsBySlug,
} from "@/hooks/useSupabaseProducts";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSupabaseWishlist } from "@/hooks/useSupabaseCart";
import {
  getBrandSuggestions,
  getModelSuggestions,
  getSimilarProducts,
  searchProducts,
} from "@/lib/productSearch";
import { Product } from "@/types/supabase";
import { useRecommendations } from "@/hooks/useRecommendations";
import { buildContactHref, getEnquiryCopy } from "@/lib/enquiry";
import { getSiteLanguage } from "@/lib/language";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductCard, ProductCardSkeletonItem } from "@/components/ProductCard";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { formatMoney } from "@/lib/pricing";
import { isMeaningfulText } from "@/lib/displayText";
import { categoryHref } from "@/lib/categoryLinks";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SortOption =
  | "recommended"
  | "newest"
  | "price-low"
  | "price-high"
  | "popular";

interface FallbackResult {
  products: Product[];
  reason: "similar" | "recently-viewed";
  message: string;
}

interface SearchSnapshot {
  signature: string;
  searchTerm: string;
  filters: Record<string, unknown>;
  resultsCount: number;
  matchedProductIds: Array<string | number>;
  pageUrl: string | null;
  metadata: Record<string, unknown>;
}

const PRODUCTS_PER_PAGE = 32;

const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

// Reads the category from a query string (from wouter's useSearch, so it
// also works during server rendering, where there is no window).
const getCategoryFromSearch = (search: string) =>
  (new URLSearchParams(search).get("category") || "").trim();

// "tools-emergency" -> "Tools Emergency": a readable label for the moment
// before the category list has loaded (and for the server-rendered HTML).
const humanizeCategoryValue = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());

export default function Products() {
  // Use centralized currency client
  const currencyCode = currencyClient.getCurrencyCode();
  const currencyRate = currencyClient.getCurrencyRate();
  const [location, navigate] = useLocation();
  // wouter's location is the pathname only; the query string is what changes
  // between /products and /products?category=..., so it is tracked separately.
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const lastTrackedSearchRef = useRef("");
  const activeSearchRef = useRef<string | null>(null);
  const pendingCompletedSearchRef = useRef<string | null>(null);
  const searchResolvedByClickRef = useRef(false);
  const lastCompletedSearchTermRef = useRef<string | null>(null);
  const pendingSearchSnapshotRef = useRef<SearchSnapshot | null>(null);
  const lastSearchSnapshotRef = useRef<{
    count: number;
    productIds: Array<string | number>;
  }>({ count: 0, productIds: [] });
  const lastProfiledSearchRef = useRef("");
  const [categoryFilter, setCategoryFilter] = useState(() =>
    getCategoryFromSearch(searchString)
  );
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(
    null
  );
  const [dealsOnly, setDealsOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [fallbackResult, setFallbackResult] = useState<FallbackResult | null>(
    null
  );

  const { user, isAuthenticated } = useAuth();
  const recommendations = useRecommendations(user?.id || null);
  const { products: allProducts, isLoading } = useProducts(1, -1);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(
    user?.id || null
  );
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { brands, isLoading: brandsLoading, error: brandsError } = useBrands();
  const { products: categoryProducts, isLoading: isCategoryLoading } =
    useProductsBySlug(categoryFilter);
  const categoryQueryValue = normalizeCategoryValue(
    getCategoryFromSearch(searchString)
  );

  // Brands offered in the filter: every brand that actually has products in
  // what is being browsed (the selected category, else the whole catalogue),
  // most-stocked first, with its logo when the brand table has one. Using the
  // whole catalogue on a category page offered Opel and BMW under Truck Bed.
  const brandSourceProducts = categoryFilter ? categoryProducts : allProducts;
  const brandOptions = useMemo(() => {
    const byKey = new Map<string, { name: string; count: number }>();
    (brandSourceProducts || []).forEach(product => {
      const name = String(product.brand || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const entry = byKey.get(key);
      if (entry) entry.count += 1;
      else byKey.set(key, { name, count: 1 });
    });
    const known = new Map(
      brands.map(brand => [
        String(brand.name || "")
          .trim()
          .toLowerCase(),
        brand,
      ])
    );
    return Array.from(byKey.entries())
      .sort(
        (a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name)
      )
      .map(([key, entry], index) => {
        const match = known.get(key);
        return {
          id: match?.id ?? -(index + 1),
          name: match?.name || entry.name,
          image_url:
            match?.image_url && match.image_url.trim() ? match.image_url : null,
          created_at: match?.created_at ?? "",
          productCount: entry.count,
        };
      });
  }, [brandSourceProducts, brands]);

  // Compute a dynamic maximum price from product data (fallback to 20000)
  const computedMaxPrice = useMemo(() => {
    try {
      const vals = Array.isArray(allProducts)
        ? allProducts.map(p => Number(p.price) || 0)
        : [];
      if (vals.length === 0) return 20000;
      const max = Math.max(...vals, 20000);
      // round up to nearest 10 or 100 for nicer slider steps
      return Math.ceil(max / 10) * 10;
    } catch (e) {
      return 20000;
    }
  }, [allProducts]);

  // Ensure priceRange uses the computed max on initial load
  useEffect(() => {
    if (!computedMaxPrice) return;
    setPriceRange(prev => {
      if (prev[1] === computedMaxPrice) return prev;
      return [prev[0], computedMaxPrice];
    });
  }, [computedMaxPrice]);

  // Lightweight non-blocking tracker helper
  const sendTrackingEvent = (payload: Record<string, any>) => {
    try {
      // Ensure a persistent session id exists for anonymous users
      try {
        if (typeof window !== "undefined") {
          let sid = localStorage.getItem("sessionId") || "";
          if (!sid) {
            sid =
              typeof crypto !== "undefined" && (crypto as any).randomUUID
                ? (crypto as any).randomUUID()
                : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            try {
              localStorage.setItem("sessionId", sid);
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
      // Fallback: fire-and-forget fetch with keepalive
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch (err) {
      // ignore tracking errors
    }
  };

  const getCurrentTrackingFilters = () => ({
    category: categoryFilter,
    brands: brandFilter,
    models: modelFilter,
    conditions: conditionFilter,
    priceRange,
    inStockOnly,
    dealsOnly,
  });

  const trackProductClick = (productId: string | number) => {
    try {
      const trackedSearchTerm = (
        activeSearchRef.current ||
        pendingCompletedSearchRef.current ||
        searchQuery ||
        ""
      ).trim();
      const clickedProduct = filteredProducts.find(
        product => String(product.id) === String(productId)
      );

      recommendations.track({
        eventType: "product_click",
        product: clickedProduct || null,
        productId,
        searchTerm: trackedSearchTerm.length > 0 ? trackedSearchTerm : null,
        products: filteredProducts.slice(0, 50),
        metadata: {
          source: "products_grid",
          filters: getCurrentTrackingFilters(),
        },
      });

      if (!trackedSearchTerm.length) {
        return;
      }

      searchResolvedByClickRef.current = true;

      sendTrackingEvent({
        sessionId:
          typeof window !== "undefined"
            ? localStorage.getItem("sessionId") || ""
            : "",
        eventType: "product_click",
        clickedProductId: productId,
        searchTerm: trackedSearchTerm.length > 0 ? trackedSearchTerm : null,
        filters: getCurrentTrackingFilters(),
        resultsCount: filteredProducts.length,
        pageUrl: window.location.href,
        matchedProductIds: filteredProducts.slice(0, 50).map(p => p.id),
      });
    } catch (e) {
      // ignore
    }
  };

  const areFiltersActive = () => {
    if (categoryFilter) return true;
    if (brandFilter.length > 0) return true;
    if (modelFilter.length > 0) return true;
    if (conditionFilter.length > 0) return true;
    if (inStockOnly) return true;
    if (dealsOnly) return true;
    if (priceRange[0] !== 0 || priceRange[1] !== computedMaxPrice) return true;
    return false;
  };

  const isSearchOrFiltersActive = () => {
    const q = (
      activeSearchRef.current ||
      pendingCompletedSearchRef.current ||
      searchQuery ||
      ""
    ).trim();
    return Boolean(q) || areFiltersActive();
  };

  // Return true only when there is an active or recently-completed search term
  const hasSearchTermActive = () => {
    const q = (
      activeSearchRef.current ||
      pendingCompletedSearchRef.current ||
      searchQuery ||
      ""
    ).trim();
    return Boolean(q);
  };

  const selectedCategory = useMemo(() => {
    if (!categoryFilter) return null;
    const normalizedFilter = normalizeCategoryValue(categoryFilter);
    return (
      categories.find(
        c =>
          normalizeCategoryValue(String(c.slug ?? "")) === normalizedFilter ||
          normalizeCategoryValue(String(c.name ?? "")) === normalizedFilter
      ) || null
    );
  }, [categories, categoryFilter]);

  useEffect(() => {
    // Intentionally left blank.
  }, [allProducts]);

  useEffect(() => {
    if (!categoryFilter) return;
    recommendations.track({
      eventType: "category_view",
      category: categoryFilter,
      metadata: { source: "products_filter" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // Load recently viewed items from localStorage
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
      setRecentlyViewedIds(ids.filter((id: any) => typeof id === "string"));
    } catch {}
  }, []);

  // Search session logic:
  // - track active typed term in sessionStorage under 'activeSearchTerm'
  // - when user clears the search bar, move the last term to 'pendingSearchTerm'
  // - when user starts a new search while a pending term exists, emit a single 'search' event for the pending term
  useEffect(() => {
    const prevActive = activeSearchRef.current;
    const q = searchQuery.trim();

    // Update activeSearchRef and sessionStorage
    if (q) {
      activeSearchRef.current = q;
      lastCompletedSearchTermRef.current = q;
      searchResolvedByClickRef.current = false;
      try {
        sessionStorage.setItem("activeSearchTerm", q);
      } catch {}
      // If there is a pending completed term (user cleared before) and they now start a new search, emit the pending term
      const pending =
        pendingCompletedSearchRef.current ||
        (() => {
          try {
            return sessionStorage.getItem("pendingSearchTerm");
          } catch {
            return null;
          }
        })();

      if (pending && pending !== q) {
        pendingCompletedSearchRef.current = null;
        try {
          sessionStorage.removeItem("pendingSearchTerm");
        } catch {}
      }
    } else {
      // search cleared: if there was an active term, emit it as a "cleared" search
      const clearedSearchTerm =
        prevActive || lastCompletedSearchTermRef.current || "";
      if (clearedSearchTerm) {
        const shouldTrackAbandonedSearch = !searchResolvedByClickRef.current;
        searchResolvedByClickRef.current = false;

        pendingCompletedSearchRef.current = null;
        try {
          sessionStorage.removeItem("pendingSearchTerm");
        } catch {}
        pendingSearchSnapshotRef.current = null;

        if (!shouldTrackAbandonedSearch) {
          activeSearchRef.current = null;
          try {
            sessionStorage.removeItem("activeSearchTerm");
          } catch {}
          return;
        }

        // Build signature using the current filters
        const signature = [
          clearedSearchTerm,
          categoryFilter,
          brandFilter.join(","),
          modelFilter.join(","),
          conditionFilter.join(","),
          `${priceRange[0]}-${priceRange[1]}`,
          inStockOnly ? "1" : "0",
          dealsOnly ? "1" : "0",
        ].join("|");

        if (lastTrackedSearchRef.current !== signature) {
          // Prefer the buffered snapshot if it matches
          const snap = pendingSearchSnapshotRef.current;
          const payloadBase =
            snap && (snap as any).signature === signature
              ? snap
              : {
                  searchTerm: clearedSearchTerm,
                  filters: getCurrentTrackingFilters(),
                  resultsCount: filteredProducts.length,
                  matchedProductIds: filteredProducts
                    .slice(0, 50)
                    .map(p => p.id),
                  pageUrl:
                    typeof window !== "undefined" ? window.location.href : null,
                  metadata: {
                    noResults: filteredProducts.length === 0,
                    cleared: true,
                    trackedAt: new Date().toISOString(),
                  },
                };

          sendTrackingEvent({
            sessionId:
              typeof window !== "undefined"
                ? localStorage.getItem("sessionId") || ""
                : "",
            eventType: "search",
            searchTerm: payloadBase.searchTerm || clearedSearchTerm,
            filters: payloadBase.filters,
            resultsCount: payloadBase.resultsCount || 0,
            matchedProductIds: payloadBase.matchedProductIds || [],
            pageUrl: payloadBase.pageUrl,
            metadata: { ...(payloadBase.metadata || {}), cleared: true },
          });

          lastTrackedSearchRef.current = signature;
        }
      }

      activeSearchRef.current = null;
      try {
        sessionStorage.removeItem("activeSearchTerm");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const selectedCategoryName = normalizeCategoryValue(
    String(selectedCategory?.name ?? "")
  );
  const selectedCategorySlug = normalizeCategoryValue(
    String(selectedCategory?.slug ?? "")
  );
  const canonicalCategoryParam =
    selectedCategory?.slug || categoryFilter || categoryQueryValue;
  const canonicalPath = canonicalCategoryParam
    ? `/products?category=${encodeURIComponent(canonicalCategoryParam)}`
    : "/products";
  const canonicalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${canonicalPath}`
      : canonicalPath;
  const seoCategoryName =
    selectedCategory?.name ||
    (categoryFilter ? humanizeCategoryValue(categoryFilter) : "");
  // Keyword-targeted copy for the category (shared/categoryContent.ts).
  const categoryContent = getCategoryContent(
    selectedCategory?.slug || (categoryFilter ? categoryFilter : null)
  );
  const seoTitle = categoryContent
    ? categoryContent.seoTitle
    : seoCategoryName
      ? `${seoCategoryName} Parts | MotorVault`
      : "MotorVault Products | OEM & Aftermarket Automotive Parts";
  // Some category rows carry placeholder text ("nn", "nnn") in `description`;
  // only real copy is allowed to become the meta description.
  const seoDescription = categoryContent
    ? categoryContent.metaDescription
    : isMeaningfulText(selectedCategory?.description)
      ? selectedCategory.description
      : "Browse MotorVault's complete catalog of automotive parts and accessories. Filter by brand, model, category, condition, price, and availability.";

  const conditionOptions = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [] as string[];

    return Array.from(
      new Set(
        allProducts.map(p => String(p.condition || "").trim()).filter(Boolean)
      )
    );
  }, [allProducts]);

  const updateCategoryInUrl = (nextCategory: string) => {
    const [path, query = ""] = location.split("?");
    const params = new URLSearchParams(query);

    if (nextCategory) {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${path}?${nextQuery}` : path;
    navigate(nextUrl);
  };

  // True when no category is selected, or the product belongs to it. The URL
  // may carry the slug or the name, so this compares against the resolved
  // category rather than the raw value.
  const isInSelectedCategory = (p: Product) => {
    if (!categoryFilter) return true;
    const productCategory = normalizeCategoryValue(p.category_name || "");
    if (selectedCategory) return productCategory === selectedCategoryName;
    return productCategory === normalizeCategoryValue(categoryFilter);
  };

  // A product matches a selected brand only on its own `brand` field. Title
  // substrings are not used: "Ram" would match "Ceramic" and "frame".
  const matchesSelectedBrand = (p: Product) =>
    brandFilter.length === 0 ||
    brandFilter.some(
      selected =>
        selected.trim().toLowerCase() ===
        String(p.brand || "")
          .trim()
          .toLowerCase()
    );

  // Get fallback products when no exact matches
  const getFallbackProducts = (
    exactResults: typeof allProducts
  ): FallbackResult | null => {
    if (exactResults.length > 0) return null;

    // 1. Try to find similar products respecting selected filters
    const filterCriteria: Partial<{
      brands: string[];
      models: string[];
      conditions: string[];
      categories: string[];
      priceRange: [number, number];
      inStock: boolean;
    }> = {};

    if (brandFilter.length > 0) filterCriteria.brands = brandFilter;
    if (modelFilter.length > 0) filterCriteria.models = modelFilter;
    if (conditionFilter.length > 0) filterCriteria.conditions = conditionFilter;
    if (categoryFilter) filterCriteria.categories = [categoryFilter];
    filterCriteria.priceRange = [priceRange[0], priceRange[1]];
    if (inStockOnly) filterCriteria.inStock = true;

    // Get all available products and filter them
    const availableProducts = allProducts || [];

    // Create a relaxed filter by removing the most restrictive constraints
    let similarResults: typeof allProducts = [];

    // First try: Remove one filter at a time starting with price range
    if (availableProducts.length > 0) {
      // Try without price constraint first
      const withoutPrice = availableProducts.filter(p => {
        if (!matchesSelectedBrand(p)) return false;
        if (modelFilter.length > 0 && !modelFilter.includes(p.model || ""))
          return false;
        if (
          conditionFilter.length > 0 &&
          !conditionFilter.includes(p.condition || "")
        )
          return false;
        if (!isInSelectedCategory(p)) return false;
        return true;
      });
      if (withoutPrice.length > 0) {
        similarResults = withoutPrice;
      } else {
        // Try without category filter
        const withoutCategory = availableProducts.filter(p => {
          if (!matchesSelectedBrand(p)) return false;
          if (modelFilter.length > 0 && !modelFilter.includes(p.model || ""))
            return false;
          if (
            conditionFilter.length > 0 &&
            !conditionFilter.includes(p.condition || "")
          )
            return false;
          return true;
        });
        if (withoutCategory.length > 0) {
          similarResults = withoutCategory;
        } else {
          // Try without condition filter
          const withoutCondition = availableProducts.filter(p => {
            if (!matchesSelectedBrand(p)) return false;
            if (modelFilter.length > 0 && !modelFilter.includes(p.model || ""))
              return false;
            if (!isInSelectedCategory(p)) return false;
            return true;
          });
          similarResults =
            withoutCondition.length > 0 ? withoutCondition : availableProducts;
        }
      }
    }

    // 2. If we found similar products, return them
    if (similarResults.length > 0) {
      return {
        products: similarResults,
        reason: "similar",
        message:
          "No exact matches found. Showing similar products based on available filters.",
      };
    }

    // 3. Fall back to recently viewed products
    const recentlyViewedProducts = availableProducts.filter(p =>
      recentlyViewedIds.includes(String(p.id))
    );

    if (recentlyViewedProducts.length > 0) {
      return {
        products: recentlyViewedProducts,
        reason: "recently-viewed",
        message:
          "No products match your search. Here are items you've recently viewed.",
      };
    }

    return null;
  };

  // Get category from URL query parameter
  useEffect(() => {
    const categoryParam = getCategoryFromSearch(searchString);
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    } else {
      setCategoryFilter("");
    }
  }, [location, searchString]);

  // One canonical URL per category: if the URL names the category ("Engines")
  // or uses different casing, swap it for the slug form ("engine") in place.
  useEffect(() => {
    const slug = String(selectedCategory?.slug || "").trim();
    if (!slug || !categoryFilter || categoryFilter === slug) return;
    if (getCategoryFromSearch(searchString) !== categoryFilter) return;
    setCategoryFilter(slug);
    navigate(`/products?category=${encodeURIComponent(slug)}`, {
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.slug, categoryFilter]);

  // Prefer category-filtered results when a category is selected, then apply local text search.
  const baseProducts = categoryFilter ? categoryProducts : allProducts;

  // Helper to get brand match priority (0 = no match, 1 = brand in title, 2 = exact brand match)
  // Helper to get brand match priority (0 = no match, 2 = the product's brand
  // is one of the selected brands). Exact, case-insensitive match on `brand`.
  const getBrandMatchPriority = (product: (typeof baseProducts)[0]): number => {
    if (brandFilter.length === 0) return 0;
    return matchesSelectedBrand(product) ? 2 : 0;
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!baseProducts) return [];

    const searchFiltered = searchQuery.trim()
      ? searchProducts(baseProducts, searchQuery, {
          includeSimilar: true,
          maxResults: 1000,
        })
      : baseProducts;

    let filtered = searchFiltered.filter(p => {
      const price =
        p.price !== null && p.price !== undefined
          ? parseFloat(String(p.price))
          : null;
      const priceMatch =
        price !== null &&
        !isNaN(price) &&
        price >= priceRange[0] &&
        price <= priceRange[1];

      // Get the category name from the selected slug
      let categoryMatch = true;
      if (categoryFilter) {
        // Support both category_name and category fields, compare with actual category name
        const productCategory = (p.category_name || "").toLowerCase();
        categoryMatch =
          productCategory === selectedCategoryName ||
          productCategory === selectedCategorySlug ||
          (!selectedCategory &&
            productCategory === normalizeCategoryValue(categoryFilter));
      }

      // Brand filter - match by brand attribute OR brand in title
      let brandMatch = true;
      const brandMatchPriority = getBrandMatchPriority(p);
      if (brandFilter.length > 0) {
        brandMatch = brandMatchPriority > 0;
      }

      // Model filter
      let modelMatch = true;
      if (modelFilter.length > 0) {
        modelMatch = modelFilter.some(
          m => (p.model || "").toLowerCase() === m.toLowerCase()
        );
      }

      // Condition filter
      let conditionMatch = true;
      if (conditionFilter.length > 0) {
        conditionMatch = conditionFilter.some(
          c => (p.condition || "").toLowerCase() === c.toLowerCase()
        );
      }

      // In stock filter
      let stockMatch = true;
      if (inStockOnly) {
        stockMatch = (p.stock || 0) > 0;
      }

      // Deals filter - product has discount field
      let dealsMatch = true;
      if (dealsOnly) {
        dealsMatch =
          p.discount !== null && p.discount !== undefined && p.discount > 0;
      }

      return (
        priceMatch &&
        categoryMatch &&
        brandMatch &&
        modelMatch &&
        conditionMatch &&
        stockMatch &&
        dealsMatch
      );
    });

    // Sort
    switch (sortBy) {
      case "recommended":
        filtered = recommendations.rank(filtered, {
          searchTerm: searchQuery,
          newestFirst: true,
        }) as Product[];
        break;
      case "price-low":
        filtered.sort((a, b) => {
          // First, prioritize by brand match if brand filter is active
          if (brandFilter.length > 0) {
            const aPriority = getBrandMatchPriority(a);
            const bPriority = getBrandMatchPriority(b);
            if (aPriority !== bPriority) {
              return bPriority - aPriority; // Higher priority first
            }
          }
          // Then sort by price
          const aPrice = parseFloat(String(a.price));
          const bPrice = parseFloat(String(b.price));
          return aPrice - bPrice;
        });
        break;
      case "price-high":
        filtered.sort((a, b) => {
          // First, prioritize by brand match if brand filter is active
          if (brandFilter.length > 0) {
            const aPriority = getBrandMatchPriority(a);
            const bPriority = getBrandMatchPriority(b);
            if (aPriority !== bPriority) {
              return bPriority - aPriority; // Higher priority first
            }
          }
          // Then sort by price
          const aPrice = parseFloat(String(a.price));
          const bPrice = parseFloat(String(b.price));
          return bPrice - aPrice;
        });
        break;
      case "popular":
        filtered = recommendations.rank(filtered, {
          searchTerm: searchQuery,
          preserveWhenNoSignals: true,
        }) as Product[];
        break;
      case "newest":
      default:
        // Prioritize by brand match if active, then keep original order
        if (brandFilter.length > 0) {
          filtered.sort((a, b) => {
            const aPriority = getBrandMatchPriority(a);
            const bPriority = getBrandMatchPriority(b);
            return bPriority - aPriority; // Higher priority first
          });
        }
        break;
    }

    // Apply fallback logic if no exact matches
    if (filtered.length === 0) {
      const fallback = getFallbackProducts(filtered);
      if (fallback) {
        setFallbackResult(fallback);
        return fallback.products;
      } else {
        setFallbackResult(null);
      }
    } else {
      setFallbackResult(null);
    }

    return filtered;
  }, [
    baseProducts,
    searchQuery,
    sortBy,
    priceRange,
    categoryFilter,
    selectedCategory,
    selectedCategoryName,
    selectedCategorySlug,
    dealsOnly,
    brandFilter,
    modelFilter,
    conditionFilter,
    inStockOnly,
    allProducts,
    recentlyViewedIds,
    recommendations,
  ]);

  useEffect(() => {
    lastSearchSnapshotRef.current = {
      count: filteredProducts.length,
      productIds: filteredProducts.slice(0, 50).map(product => product.id),
    };
  }, [filteredProducts]);

  const searchFeedback = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || !baseProducts || filteredProducts.length === 0) {
      return null;
    }

    const hasExactMatch = baseProducts.some(product => {
      const exactFields = [
        product.title,
        product.brand,
        product.model,
        product.category_name,
        product.part_number,
      ]
        .filter(Boolean)
        .map(value => String(value).trim().toLowerCase());

      return exactFields.includes(query);
    });

    if (hasExactMatch) return null;

    return {
      query,
      count: filteredProducts.length,
      products: filteredProducts.slice(0, 6),
    };
  }, [searchQuery, baseProducts, filteredProducts]);

  // Debounce and buffer stabilized searches. We DO NOT emit here; searches are
  // emitted only when they lead to a product click or when the user clears
  // the search input (meaning they didn't find what they wanted).
  useEffect(() => {
    const searchTerm = searchQuery.trim();
    if (!searchTerm) return;

    const trackingSignature = [
      searchTerm,
      categoryFilter,
      brandFilter.join(","),
      modelFilter.join(","),
      conditionFilter.join(","),
      `${priceRange[0]}-${priceRange[1]}`,
      inStockOnly ? "1" : "0",
      dealsOnly ? "1" : "0",
    ].join("|");

    const timer = window.setTimeout(() => {
      pendingSearchSnapshotRef.current = {
        signature: trackingSignature,
        searchTerm,
        filters: {
          category: categoryFilter,
          brands: brandFilter,
          models: modelFilter,
          conditions: conditionFilter,
          priceRange,
          inStockOnly,
          dealsOnly,
        },
        resultsCount: filteredProducts.length,
        matchedProductIds: filteredProducts
          .slice(0, 50)
          .map(product => product.id),
        pageUrl: typeof window !== "undefined" ? window.location.href : null,
        metadata: {
          exactMatch: Boolean(
            searchFeedback === null && filteredProducts.length > 0
          ),
          noResults: filteredProducts.length === 0,
          fallbackShown: Boolean(fallbackResult),
          trackedAt: new Date().toISOString(),
        },
      };

      if (lastProfiledSearchRef.current !== trackingSignature) {
        recommendations.track({
          eventType: "search",
          searchTerm,
          products: filteredProducts.slice(0, 50),
          metadata: {
            source: "products_search",
            filters: {
              category: categoryFilter,
              brands: brandFilter,
              models: modelFilter,
              conditions: conditionFilter,
              priceRange,
              inStockOnly,
              dealsOnly,
            },
            exactMatch: Boolean(
              searchFeedback === null && filteredProducts.length > 0
            ),
            noResults: filteredProducts.length === 0,
            fallbackShown: Boolean(fallbackResult),
          },
        });
        lastProfiledSearchRef.current = trackingSignature;
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    searchQuery,
    categoryFilter,
    brandFilter,
    modelFilter,
    conditionFilter,
    priceRange,
    inStockOnly,
    dealsOnly,
    filteredProducts,
    searchFeedback,
    fallbackResult,
    recommendations,
  ]);

  const categoryGuides = getGuidesForCategory(
    selectedCategory?.slug || categoryFilter || null
  );
  // Vehicle pages that list at least one of this category's products.
  const categoryVehicles = useMemo(() => {
    if (!selectedCategory) return [];
    const slugs = new Set<string>();
    filteredProducts.forEach(product => {
      vehiclesMatchingTitle(product.title).forEach(v => slugs.add(v.slug));
    });
    return VEHICLES.filter(vehicle => slugs.has(vehicle.slug));
  }, [selectedCategory, filteredProducts]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  );
  const paginationPages = useMemo<(number | string)[]>(() => {
    if (totalPages <= 8) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    return [1, 2, 3, 4, 5, 6, 7, "ellipsis", totalPages];
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    categoryFilter,
    sortBy,
    priceRange,
    dealsOnly,
    inStockOnly,
    brandFilter,
    modelFilter,
    conditionFilter,
  ]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const allDisplayedProducts = useMemo(() => {
    // When search is active and results fit on one page (specific/limited results),
    // show all of them without pagination. Otherwise, use normal pagination.
    if (hasSearchTermActive() && filteredProducts.length <= PRODUCTS_PER_PAGE) {
      return filteredProducts;
    }
    // Standard pagination for browsing or when results exceed one page
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // ---- Presentation helpers (no filtering logic lives below this line) ----

  const modelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (allProducts || [])
            .map(p => p.model)
            .filter((model): model is string => Boolean(model))
        )
      ),
    [allProducts]
  );

  // Real per-category product counts for the filter list.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (allProducts || []).forEach(product => {
      const key = normalizeCategoryValue(String(product.category_name || ""));
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [allProducts]);

  const activeCategoryLabel = categoryFilter
    ? selectedCategory?.name || humanizeCategoryValue(categoryFilter)
    : "";
  const isPriceFiltered =
    priceRange[0] !== 0 || priceRange[1] !== computedMaxPrice;
  const hasActiveFilters = areFiltersActive();

  const clearAllFilters = () => {
    setBrandFilter([]);
    setModelFilter([]);
    setConditionFilter([]);
    setInStockOnly(false);
    setDealsOnly(false);
    setPriceRange([0, computedMaxPrice]);
    if (categoryFilter) {
      setCategoryFilter("");
      updateCategoryInUrl("");
    }
  };

  const toggleBrand = (brandName: string) => {
    setBrandFilter(prevBrands =>
      prevBrands.includes(brandName)
        ? prevBrands.filter(b => b !== brandName)
        : [...prevBrands, brandName]
    );
  };

  const activeFilterChips: Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }> = [
    ...(categoryFilter
      ? [
          {
            key: `category-${categoryFilter}`,
            label: activeCategoryLabel,
            onRemove: () => {
              setCategoryFilter("");
              updateCategoryInUrl("");
            },
          },
        ]
      : []),
    ...brandFilter.map(brand => ({
      key: `brand-${brand}`,
      label: brand,
      onRemove: () => toggleBrand(brand),
    })),
    ...modelFilter.map(model => ({
      key: `model-${model}`,
      label: model,
      onRemove: () => setModelFilter(modelFilter.filter(m => m !== model)),
    })),
    ...conditionFilter.map(condition => ({
      key: `condition-${condition}`,
      label: condition,
      onRemove: () =>
        setConditionFilter(conditionFilter.filter(c => c !== condition)),
    })),
    ...(inStockOnly
      ? [
          {
            key: "in-stock",
            label: "In Stock Only",
            onRemove: () => setInStockOnly(false),
          },
        ]
      : []),
    ...(dealsOnly
      ? [
          {
            key: "deals",
            label: "Deals Only",
            onRemove: () => setDealsOnly(false),
          },
        ]
      : []),
    ...(isPriceFiltered
      ? [
          {
            key: "price",
            label: `${formatMoney(priceRange[0])} – ${formatMoney(priceRange[1])}`,
            onRemove: () => setPriceRange([0, computedMaxPrice]),
          },
        ]
      : []),
  ];

  const filterOptionClass =
    "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-ink";
  const filterHeadingClass =
    "mb-2 font-sans text-[13px] font-semibold tracking-normal text-ink";

  const shouldShowPageSkeleton =
    (isLoading && allProducts.length === 0) ||
    (categoryFilter && isCategoryLoading && categoryProducts.length === 0);
  const shouldShowGridSkeleton = shouldShowPageSkeleton;

  return (
    <>
      <SEOHead
        pageType="category"
        title={seoTitle}
        description={seoDescription}
        keywords={[
          "automotive parts",
          "car parts",
          "OEM parts",
          "aftermarket parts",
          "auto accessories",
        ]}
        canonical={canonicalUrl}
        // A category that does not exist must not become an indexable empty
        // page (the server also answers it with 404).
        noIndex={Boolean(
          categoryFilter &&
            !categoriesLoading &&
            categories.length > 0 &&
            !selectedCategory
        )}
      />
      <div className="min-h-screen w-full overflow-x-hidden bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="container py-6 sm:py-8">
            <Breadcrumb
              items={[
                { label: "Products", href: "/products" },
                ...(activeCategoryLabel
                  ? [{ label: activeCategoryLabel, href: canonicalPath }]
                  : []),
              ]}
              className="mb-3"
              includeStructuredData={false}
            />
            <h1 className="text-ink">
              {activeCategoryLabel || "All Products"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-600 sm:text-base">
              {categoryContent ? (
                <>
                  {categoryContent.intro}{" "}
                  <span className="whitespace-nowrap">
                    {filteredProducts.length} products.
                  </span>
                </>
              ) : (
                <>Browse our collection of {filteredProducts.length} products</>
              )}
            </p>
          </div>
        </div>

        <div className="container py-6 sm:py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
            {/* Sidebar Filters - full-screen sheet on mobile, sticky rail on desktop */}
            <aside
              aria-label="Filters"
              className={
                showFilters
                  ? "fixed inset-0 z-[70] flex flex-col bg-white lg:static lg:z-auto lg:block"
                  : "hidden lg:block"
              }
            >
              <h2 className="sr-only hidden lg:block">Filters</h2>
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 lg:hidden">
                <p className="font-display text-lg font-bold">Filters</p>
                <button
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                  className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-4 lg:overflow-visible lg:px-0">
                {/* Category Filter */}
                <div className="py-5 lg:pt-0">
                  <h3 className={filterHeadingClass}>Category</h3>
                  <div className="-mx-2 space-y-0.5 lg:max-h-[35rem] lg:overflow-y-auto lg:pr-1">
                    <label
                      className={`${filterOptionClass} ${
                        categoryFilter === ""
                          ? "bg-gray-100 font-semibold text-ink"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value=""
                        checked={categoryFilter === ""}
                        onChange={e => {
                          const nextValue = e.target.value;
                          setCategoryFilter(nextValue);
                          updateCategoryInUrl(nextValue);
                        }}
                        className="h-4 w-4 flex-none"
                      />
                      <span className="flex-1 truncate">All Categories</span>
                      <span className="price text-xs font-normal text-gray-500">
                        {allProducts.length > 0 ? allProducts.length : ""}
                      </span>
                    </label>
                    {categoriesLoading && categories.length === 0 ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="mx-2 my-1.5 h-6" />
                      ))
                    ) : categories.length > 0 ? (
                      categories.map(cat => {
                        const categoryValue = String(
                          cat.slug || cat.name || ""
                        );
                        const normalizedCategoryValue =
                          normalizeCategoryValue(categoryValue);
                        const normalizedCategoryFilter =
                          normalizeCategoryValue(categoryFilter);
                        const isSelected =
                          normalizedCategoryFilter ===
                            normalizedCategoryValue ||
                          normalizedCategoryFilter ===
                            normalizeCategoryValue(String(cat.name ?? ""));
                        const count = categoryCounts.get(
                          normalizeCategoryValue(String(cat.name ?? ""))
                        );

                        return (
                          <label
                            key={cat.id}
                            className={`${filterOptionClass} ${
                              isSelected
                                ? "bg-gray-100 font-semibold text-ink"
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="category"
                              value={categoryValue}
                              checked={isSelected}
                              onChange={e => {
                                const nextValue = e.target.value;
                                setCategoryFilter(nextValue);
                                updateCategoryInUrl(nextValue);
                              }}
                              className="h-4 w-4 flex-none"
                            />
                            <span className="flex-1 truncate">{cat.name}</span>
                            {count ? (
                              <span className="price text-xs font-normal text-gray-500">
                                {count}
                              </span>
                            ) : null}
                          </label>
                        );
                      })
                    ) : (
                      <p className="px-2 py-1 text-xs text-gray-500">
                        No categories available
                      </p>
                    )}
                  </div>
                </div>

                {/* Price Range */}
                <div className="py-5">
                  <h3 className={filterHeadingClass}>Price Range</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="price flex justify-between text-xs text-gray-600">
                        <span>Min:</span>
                        <span className="font-medium text-ink">
                          {formatMoney(priceRange[0])}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={computedMaxPrice}
                        value={priceRange[0]}
                        aria-label="Minimum price"
                        onChange={e => {
                          const newMin = parseInt(e.target.value);
                          if (newMin <= priceRange[1]) {
                            setPriceRange([newMin, priceRange[1]]);
                          }
                        }}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="price flex justify-between text-xs text-gray-600">
                        <span>Max:</span>
                        <span className="font-medium text-ink">
                          {formatMoney(priceRange[1])}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={computedMaxPrice}
                        value={priceRange[1]}
                        aria-label="Maximum price"
                        onChange={e => {
                          const newMax = parseInt(e.target.value);
                          if (newMax >= priceRange[0]) {
                            setPriceRange([priceRange[0], newMax]);
                          }
                        }}
                        className="mt-1 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Availability + Deals */}
                <div className="py-5">
                  <h3 className={filterHeadingClass}>Availability</h3>
                  <div className="-mx-2">
                    <label className={filterOptionClass}>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={e => {
                          setInStockOnly(e.target.checked);
                        }}
                        className="h-4 w-4 flex-none"
                      />
                      <span>In Stock Only</span>
                    </label>
                  </div>
                  <h3 className={`${filterHeadingClass} mt-4`}>
                    Special Offers
                  </h3>
                  <div className="-mx-2">
                    <label className={filterOptionClass}>
                      <input
                        type="checkbox"
                        checked={dealsOnly}
                        onChange={e => {
                          setDealsOnly(e.target.checked);
                        }}
                        className="h-4 w-4 flex-none"
                      />
                      <span>Deals Only</span>
                    </label>
                  </div>
                </div>

                {/* Condition Filter */}
                <div className="py-5">
                  <h3 className={filterHeadingClass}>Condition</h3>
                  <div className="-mx-2 max-h-48 space-y-0.5 overflow-y-auto pr-1">
                    {conditionOptions.length > 0 ? (
                      conditionOptions.map(condition => (
                        <label key={condition} className={filterOptionClass}>
                          <input
                            type="checkbox"
                            checked={conditionFilter.includes(condition)}
                            onChange={e => {
                              if (e.target.checked) {
                                setConditionFilter([
                                  ...conditionFilter,
                                  condition,
                                ]);
                              } else {
                                setConditionFilter(
                                  conditionFilter.filter(c => c !== condition)
                                );
                              }
                            }}
                            className="h-4 w-4 flex-none"
                          />
                          <span className="truncate">{condition}</span>
                        </label>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-gray-500">
                        No conditions available
                      </p>
                    )}
                  </div>
                </div>

                {/* Model Filter */}
                <div className="py-5">
                  <h3 className={filterHeadingClass}>Model</h3>
                  <div className="-mx-2 max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    {modelOptions.length > 0 ? (
                      modelOptions.map(model => (
                        <label key={model} className={filterOptionClass}>
                          <input
                            type="checkbox"
                            checked={modelFilter.includes(model)}
                            onChange={e => {
                              if (e.target.checked) {
                                setModelFilter([...modelFilter, model]);
                              } else {
                                setModelFilter(
                                  modelFilter.filter(m => m !== model)
                                );
                              }
                            }}
                            className="h-4 w-4 flex-none"
                          />
                          <span className="truncate">{model}</span>
                        </label>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-gray-500">
                        No models available
                      </p>
                    )}
                  </div>
                </div>
                {/* Fitment help */}
                <div className="py-5">
                  <Link
                    href="/vin-decoder"
                    className="flex items-start gap-2.5 rounded-lg bg-gray-50 p-3 text-[13px] font-medium leading-snug text-ink transition-colors hover:bg-gray-100"
                  >
                    <ScanLine
                      className="mt-px h-4 w-4 flex-none text-gray-500"
                      aria-hidden="true"
                    />
                    <span>Not sure it fits? Decode your VIN</span>
                  </Link>
                </div>
              </div>

              {/* Mobile sheet footer */}
              <div className="flex gap-3 border-t border-gray-200 bg-white p-4 lg:hidden">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="btn-secondary flex-1"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="btn-primary flex-[2]"
                >
                  <span>Show results</span>
                  <span className="price">({filteredProducts.length})</span>
                </button>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="min-w-0">
              {/* Toolbar: search + sort (+ filters on mobile) */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <SearchIcon
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search products..."
                    aria-label="Search products..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                    }}
                    className="field pl-10"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilters(true)}
                    className="btn-secondary flex-1 px-4 lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    <span>Filters</span>
                    {activeFilterChips.length > 0 && (
                      <span className="price flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-bold text-white">
                        {activeFilterChips.length}
                      </span>
                    )}
                  </button>
                  <label className="flex flex-1 items-center gap-2 sm:flex-none">
                    <span className="hidden whitespace-nowrap text-sm text-gray-600 xl:inline">
                      Sort By
                    </span>
                    <select
                      value={sortBy}
                      onChange={e => {
                        setSortBy(e.target.value as SortOption);
                      }}
                      aria-label="Sort By"
                      // Tighter padding on phones so "Recommended" fits at the
                      // 16px size that stops iOS zooming into the field.
                      className="field !pl-3 !pr-8 sm:w-52 sm:!pl-3.5 sm:!pr-9"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="newest">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="popular">Popular</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Brand Filter */}
              <div className="mt-4">
                <BrandFilter
                  brands={brandOptions}
                  selectedBrands={brandFilter}
                  onBrandToggle={toggleBrand}
                  isLoading={brandsLoading && brandOptions.length === 0}
                  compact={false}
                  error={brandOptions.length > 0 ? null : brandsError}
                />
              </div>

              {/* Active filters */}
              {activeFilterChips.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeFilterChips.map(chip => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-2 text-[13px] font-medium text-ink transition-colors hover:bg-gray-200"
                    >
                      <span className="max-w-[12rem] truncate">
                        {chip.label}
                      </span>
                      <X
                        className="h-3.5 w-3.5 text-gray-500"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-1 text-[13px] font-semibold text-ink underline underline-offset-4 hover:text-gray-600"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {searchFeedback && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <p className="text-sm font-semibold text-ink">
                    No exact product found for “{searchQuery.trim()}”. Showing{" "}
                    {searchFeedback.count} matching result
                    {searchFeedback.count !== 1 ? "s" : ""}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchFeedback.products.map(product => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        onClick={() => {
                          trackProductClick(product.id);
                        }}
                        className="inline-flex max-w-full items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-ink hover:border-ink"
                      >
                        <span className="truncate">{product.title}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Enquire CTA: help message and enquire button (prefilled Product inquiry) */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-700">
                      Can't find what you are looking for? Let us help.
                    </p>
                    {(() => {
                      const activeFilters: string[] = [];
                      if (categoryFilter)
                        activeFilters.push(`category: ${categoryFilter}`);
                      if (brandFilter.length)
                        activeFilters.push(`brands: ${brandFilter.join(",")}`);
                      if (modelFilter.length)
                        activeFilters.push(`models: ${modelFilter.join(",")}`);
                      if (conditionFilter.length)
                        activeFilters.push(
                          `conditions: ${conditionFilter.join(",")}`
                        );
                      if (inStockOnly) activeFilters.push("inStockOnly: true");
                      if (dealsOnly) activeFilters.push("dealsOnly: true");
                      if (priceRange && priceRange.length === 2)
                        activeFilters.push(
                          `priceRange: ${priceRange[0]}-${priceRange[1]}`
                        );

                      const filtersStr = activeFilters.length
                        ? activeFilters.join("; ")
                        : "None";
                      const enquiryCopy = getEnquiryCopy(getSiteLanguage());
                      const subject = enquiryCopy.searchSubject;
                      const message = `${enquiryCopy.searchItemLabel}: ${searchQuery.trim()}\n${enquiryCopy.searchSpecLabel}: ${filtersStr}`;
                      const country = currencyClient.getCountryCode() || "";

                      const params = new URLSearchParams();
                      if (user && typeof user.name === "string")
                        params.set("name", user.name);
                      if (user && typeof user.email === "string")
                        params.set("email", user.email);
                      if (country) params.set("location", country);
                      // Mark link as coming from enquiry CTA so contact can tailor the message template
                      params.set("enquiry", "1");
                      params.set("includeGeo", "0");
                      params.set("subject", subject);
                      params.set("message", message);

                      const href = buildContactHref(params);

                      return (
                        <a href={href} className="btn-primary btn-sm">
                          Enquire
                        </a>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Shown when nothing matched exactly and similar items are listed instead */}
              {fallbackResult &&
                !searchFeedback &&
                allDisplayedProducts.length > 0 && (
                  <div
                    role="status"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <p className="text-sm text-gray-700">
                      {fallbackResult.message}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-sm font-semibold text-ink underline underline-offset-4"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}

              {/* Products Count */}
              <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>
                  Showing {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? "s" : ""}
                </span>
                {filteredProducts.length > PRODUCTS_PER_PAGE && (
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Products Grid */}
              <h2 className="sr-only">Products</h2>
              {shouldShowGridSkeleton ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <ProductCardSkeletonItem key={idx} />
                  ))}
                </div>
              ) : allDisplayedProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {allDisplayedProducts.map((product: Product, idx: number) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={idx < 4}
                      isWished={wishedProductIds.has(product.id)}
                      onNavigate={item => trackProductClick(item.id)}
                      onWishlistToggle={async item => {
                        try {
                          await toggleWishlist(item.id);
                        } catch {}
                      }}
                      onQuickView={item => {
                        recommendations.track({
                          eventType: "product_view",
                          product: item,
                          productId: item.id,
                          metadata: { source: "products_quick_view" },
                        });
                        setQuickViewProductId(item.id);
                      }}
                      onAddToCart={addProduct}
                      isAdding={pendingId === product.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <SearchIcon
                      className="h-5 w-5 text-gray-500"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-base font-semibold text-ink">
                    No products found
                  </p>
                  {fallbackResult ? (
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-600">
                      {fallbackResult.message}
                    </p>
                  ) : (
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-600">
                      Try a different search term
                    </p>
                  )}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="btn-secondary btn-sm mt-5"
                    >
                      Clear all
                    </button>
                  )}
                  <p className="mt-5">
                    <Link
                      href="/vin-decoder"
                      className="text-sm font-medium text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                    >
                      Not sure it fits? Decode your VIN
                    </Link>
                  </p>
                </div>
              )}

              {filteredProducts.length > PRODUCTS_PER_PAGE && (
                <div className="mt-10 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(page => Math.max(1, page - 1));
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {paginationPages.map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === "ellipsis" ? (
                            <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-500">
                              ...
                            </span>
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={e => {
                                e.preventDefault();
                                setCurrentPage(page as number);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(page =>
                              Math.min(totalPages, page + 1)
                            );
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Answers to what shoppers search about this category */}
        {categoryContent && categoryContent.faqs.length > 0 && (
          <section className="border-t border-gray-200 bg-white">
            <div className="container py-8 sm:py-10">
              <h2 className="text-lg font-bold text-ink sm:text-xl">
                {activeCategoryLabel}: common questions
              </h2>
              <div className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200">
                {categoryContent.faqs.map(faq => (
                  <details key={faq.question} className="group px-4 sm:px-5">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-ink sm:text-base [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <span
                        aria-hidden="true"
                        className="flex-none text-gray-400 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-gray-700">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Where this category connects to the rest of the site: the vehicle
            pages its products appear on and the guides written about it. */}
        {selectedCategory &&
          (categoryVehicles.length > 0 || categoryGuides.length > 0) && (
            <section className="border-t border-gray-200 bg-white">
              <div className="container space-y-8 py-8 sm:py-10">
                {categoryVehicles.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-ink">
                      {activeCategoryLabel} by vehicle
                    </h2>
                    <RelatedLinks
                      className="mt-4"
                      links={categoryVehicles.map(vehicle => ({
                        href: `/vehicle/${vehicle.slug}`,
                        label: `${vehicle.name} parts`,
                      }))}
                    />
                  </div>
                )}
                {categoryGuides.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-ink">
                      {activeCategoryLabel} guides
                    </h2>
                    <RelatedLinks className="mt-4" links={categoryGuides} />
                  </div>
                )}
              </div>
            </section>
          )}

        {/* Category navigation as plain links (the filter rail uses form
            controls, which crawlers do not follow) */}
        {categories.length > 0 && (
          <section className="border-t border-gray-200 bg-gray-50">
            <div className="container py-8 sm:py-10">
              <h2 className="text-lg font-bold text-ink">Shop by Category</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {categories
                  .filter(
                    cat =>
                      normalizeCategoryValue(String(cat.name ?? "")) !==
                      selectedCategoryName
                  )
                  .map(cat => (
                    <li key={cat.id}>
                      <Link
                        href={categoryHref(String(cat.slug || cat.name || ""))}
                        className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
              </ul>
              <p className="mt-5 text-sm text-gray-600">
                <Link
                  href="/blog"
                  className="font-medium text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                >
                  Read fitment and repair guides
                </Link>
              </p>
            </div>
          </section>
        )}

        {/* Quick View Modal */}
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
