'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Filter, X, Star, Heart, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductsPageSkeleton } from '@/components/skeletons/ProductsPageSkeleton';
import { QuickViewModal } from '@/components/QuickViewModal';
import { BrandFilter } from '@/components/BrandFilter';
import { useProducts, useSearchProducts, useCategories, useProductsBySlug } from '@/hooks/useSupabaseProducts';
import { useBrands } from '@/hooks/useBrands';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { getHighResImageUrl } from '@/lib/images';
import { getBrandSuggestions, getModelSuggestions, getSimilarProducts } from '@/lib/productSearch';
import { Product } from '@/types/supabase';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';

interface FallbackResult {
  products: Product[];
  reason: 'similar' | 'recently-viewed';
  message: string;
}
const PRODUCTS_PER_PAGE = 32;

const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

const getCategoryFromUrl = () => {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  return decodeURIComponent(params.get('category') || '');
};

export default function Products() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(null);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [fallbackResult, setFallbackResult] = useState<FallbackResult | null>(null);

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { products: allProducts, isLoading } = useProducts(1, -1);
  const { results: searchResults, isLoading: isSearching } = useSearchProducts(searchQuery);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { brands, isLoading: brandsLoading, error: brandsError } = useBrands();
  const { products: categoryProducts, isLoading: isCategoryLoading } = useProductsBySlug(categoryFilter);
  const categoryQueryValue = normalizeCategoryValue(getCategoryFromUrl());

  const selectedCategory = useMemo(() => {
    if (!categoryFilter) return null;
    const normalizedFilter = normalizeCategoryValue(categoryFilter);
    return categories.find(
      (c) =>
        normalizeCategoryValue(String(c.slug ?? '')) === normalizedFilter ||
        normalizeCategoryValue(String(c.name ?? '')) === normalizedFilter
    ) || null;
  }, [categories, categoryFilter]);

  useEffect(() => {
    // Intentionally left blank.
  }, [allProducts]);

  // Load recently viewed items from localStorage
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewedIds(ids.filter((id: any) => typeof id === 'string'));
    } catch (error) {
      console.error('[Products] Failed to load recently viewed items:', error);
    }
  }, []);

  const selectedCategoryName = normalizeCategoryValue(String(selectedCategory?.name ?? ''));
  const selectedCategorySlug = normalizeCategoryValue(String(selectedCategory?.slug ?? ''));

  const conditionOptions = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [] as string[];

    return Array.from(
      new Set(
        allProducts
          .map((p) => String(p.condition || '').trim())
          .filter(Boolean)
      )
    );
  }, [allProducts]);

  const updateCategoryInUrl = (nextCategory: string) => {
    const [path, query = ''] = location.split('?');
    const params = new URLSearchParams(query);

    if (nextCategory) {
      params.set('category', nextCategory);
    } else {
      params.delete('category');
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${path}?${nextQuery}` : path;
    navigate(nextUrl);
  };

  // Get fallback products when no exact matches
  const getFallbackProducts = (exactResults: typeof allProducts): FallbackResult | null => {
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
        if (brandFilter.length > 0 && !brandFilter.includes(p.brand || '')) return false;
        if (modelFilter.length > 0 && !modelFilter.includes(p.model || '')) return false;
        if (conditionFilter.length > 0 && !conditionFilter.includes(p.condition || '')) return false;
        if (categoryFilter && categoryFilter !== (p.category_name || '')) return false;
        return true;
      });
      if (withoutPrice.length > 0) {
        similarResults = withoutPrice;
      } else {
        // Try without category filter
        const withoutCategory = availableProducts.filter(p => {
          if (brandFilter.length > 0 && !brandFilter.includes(p.brand || '')) return false;
          if (modelFilter.length > 0 && !modelFilter.includes(p.model || '')) return false;
          if (conditionFilter.length > 0 && !conditionFilter.includes(p.condition || '')) return false;
          return true;
        });
        if (withoutCategory.length > 0) {
          similarResults = withoutCategory;
        } else {
          // Try without condition filter
          const withoutCondition = availableProducts.filter(p => {
            if (brandFilter.length > 0 && !brandFilter.includes(p.brand || '')) return false;
            if (modelFilter.length > 0 && !modelFilter.includes(p.model || '')) return false;
            if (categoryFilter && categoryFilter !== (p.category_name || '')) return false;
            return true;
          });
          similarResults = withoutCondition.length > 0 ? withoutCondition : availableProducts;
        }
      }
    }

    // 2. If we found similar products, return them
    if (similarResults.length > 0) {
      return {
        products: similarResults,
        reason: 'similar',
        message: 'No exact matches found. Showing similar products based on available filters.',
      };
    }

    // 3. Fall back to recently viewed products
    const recentlyViewedProducts = availableProducts.filter(p => 
      recentlyViewedIds.includes(String(p.id))
    );

    if (recentlyViewedProducts.length > 0) {
      return {
        products: recentlyViewedProducts,
        reason: 'recently-viewed',
        message: 'No products match your search. Here are items you\'ve recently viewed.',
      };
    }

    return null;
  };

  // Get category from URL query parameter
  useEffect(() => {
    const categoryParam = getCategoryFromUrl();
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    } else {
      setCategoryFilter('');
    }
  }, [location]);

  // Prefer server-filtered category results when a category is selected.
  const baseProducts = searchQuery ? searchResults : categoryFilter ? categoryProducts : allProducts;

  // Helper to get brand match priority (0 = no match, 1 = brand in title, 2 = exact brand match)
  const getBrandMatchPriority = (product: typeof baseProducts[0]): number => {
    if (brandFilter.length === 0) return 0;

    const productBrand = (product.brand || '').toLowerCase();
    const productTitle = (product.title || '').toLowerCase();

    for (const selectedBrand of brandFilter) {
      const selectedBrandLower = selectedBrand.toLowerCase();
      // Exact brand attribute match (highest priority)
      if (productBrand === selectedBrandLower) {
        return 2;
      }
      // Brand in title match (lower priority)
      if (productTitle.includes(selectedBrandLower)) {
        return 1;
      }
    }

    return 0;
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!baseProducts) return [];

    let filtered = baseProducts.filter((p) => {
      const price = p.price !== null && p.price !== undefined 
        ? parseFloat(String(p.price))
        : null;
      const priceMatch = price !== null && !isNaN(price) && price >= priceRange[0] && price <= priceRange[1];
      
      // Get the category name from the selected slug
      let categoryMatch = true;
      if (categoryFilter) {
        // Support both category_name and category fields, compare with actual category name
        const productCategory = (p.category_name || '').toLowerCase();
        categoryMatch =
          productCategory === selectedCategoryName ||
          productCategory === selectedCategorySlug ||
          (!selectedCategory && productCategory === normalizeCategoryValue(categoryFilter));
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
          m => (p.model || '').toLowerCase() === m.toLowerCase()
        );
      }

      // Condition filter
      let conditionMatch = true;
      if (conditionFilter.length > 0) {
        conditionMatch = conditionFilter.some(
          c => (p.condition || '').toLowerCase() === c.toLowerCase()
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
        dealsMatch = p.discount !== null && p.discount !== undefined && p.discount > 0;
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
      case 'price-low':
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
      case 'price-high':
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
      case 'popular':
        // Prioritize by brand match if active, then keep original order
        if (brandFilter.length > 0) {
          filtered.sort((a, b) => {
            const aPriority = getBrandMatchPriority(a);
            const bPriority = getBrandMatchPriority(b);
            return bPriority - aPriority; // Higher priority first
          });
        }
        break;
      case 'newest':
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
  }, [baseProducts, sortBy, priceRange, categoryFilter, selectedCategory, selectedCategoryName, selectedCategorySlug, dealsOnly, brandFilter, modelFilter, conditionFilter, inStockOnly, allProducts, recentlyViewedIds]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, sortBy, priceRange, dealsOnly, inStockOnly, brandFilter, modelFilter, conditionFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const allDisplayedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const shouldShowPageSkeleton =
    (isLoading && allProducts.length === 0) ||
    (categoryFilter && isCategoryLoading && categoryProducts.length === 0);

  if (shouldShowPageSkeleton) {
    return <ProductsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 py-6 md:py-8">
        <div className="w-full max-w-full mx-auto px-2 sm:px-3 md:px-4 lg:px-2">
          {categoryFilter && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">Viewing category:</span>
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {categories.find(
                  (c) =>
                    String(c.slug ?? '').toLowerCase() === categoryFilter.toLowerCase() ||
                    String(c.name ?? '').toLowerCase() === categoryFilter.toLowerCase()
                )?.name || categoryFilter}
              </span>
              <button
                onClick={() => {
                  setCategoryFilter('');
                  updateCategoryInUrl('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              >
                <X className="w-4 h-4 inline-block" />
              </button>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-2">All Products</h1>
          <p className="text-sm sm:text-base text-gray-600">Browse our collection of {filteredProducts.length} products</p>
        </div>
      </div>

      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Sidebar Filters */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-gray-50 p-6 rounded-lg sticky top-4">
              <div className="flex items-center justify-between mb-6 lg:hidden">
                <h2 className="text-lg font-bold">Filters</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Category</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <label className={`flex items-center cursor-pointer p-2 rounded transition-colors ${
                    categoryFilter === '' 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'hover:bg-gray-100'
                  }`}>
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={categoryFilter === ''}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setCategoryFilter(nextValue);
                        updateCategoryInUrl(nextValue);
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm ml-2 font-medium">All Categories</span>
                  </label>
                  {categoriesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-7 w-24" />
                    ))
                  ) : categories.length > 0 ? (
                    categories.map((cat) => {
                      const categoryValue = String(cat.slug || cat.name || '');
                      const normalizedCategoryValue = normalizeCategoryValue(categoryValue);
                      const normalizedCategoryFilter = normalizeCategoryValue(categoryFilter);
                      const isSelected =
                        normalizedCategoryFilter === normalizedCategoryValue ||
                        normalizedCategoryFilter === normalizeCategoryValue(String(cat.name ?? ''));
                      
                      return (
                        <label 
                          key={cat.id} 
                          className={`flex items-center cursor-pointer p-2 rounded transition-colors ${
                            isSelected
                              ? 'bg-blue-100 text-blue-900' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={categoryValue}
                            checked={isSelected}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setCategoryFilter(nextValue);
                              updateCategoryInUrl(nextValue);
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm ml-2 font-medium">{cat.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-500 p-2">No categories available</p>
                  )}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Brand</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allProducts && allProducts.length > 0 ? (
                    Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean))).map((brand) => (
                      <label 
                        key={brand}
                        className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={brandFilter.includes(brand as string)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBrandFilter([...brandFilter, brand as string]);
                            } else {
                              setBrandFilter(brandFilter.filter(b => b !== brand));
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm ml-2">{brand}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 p-2">No brands available</p>
                  )}
                </div>
              </div>

              {/* Model Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Model</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allProducts && allProducts.length > 0 ? (
                    Array.from(new Set(allProducts.map(p => p.model).filter(Boolean))).map((model) => (
                      <label 
                        key={model}
                        className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={modelFilter.includes(model as string)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModelFilter([...modelFilter, model as string]);
                            } else {
                              setModelFilter(modelFilter.filter(m => m !== model));
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm ml-2">{model}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 p-2">No models available</p>
                  )}
                </div>
              </div>

              {/* Condition Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Condition</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {conditionOptions.length > 0 ? conditionOptions.map((condition) => (
                    <label
                      key={condition}
                      className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={conditionFilter.includes(condition)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConditionFilter([...conditionFilter, condition]);
                          } else {
                            setConditionFilter(conditionFilter.filter(c => c !== condition));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm ml-2">{condition}</span>
                    </label>
                  )) : (
                    <p className="text-xs text-gray-500 p-2">No conditions available</p>
                  )}
                </div>
              </div>

              {/* In Stock Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Availability</h3>
                <label className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm ml-2 font-medium">In Stock Only</span>
                </label>
              </div>
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Price Range</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">Min: ${priceRange[0]}</label>
                    <input
                      type="range"
                      min="0"
                      max="20000"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value);
                        if (newMin <= priceRange[1]) {
                          setPriceRange([newMin, priceRange[1]]);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max: ${priceRange[1]}</label>
                    <input
                      type="range"
                      min="0"
                      max="20000"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value);
                        if (newMax >= priceRange[0]) {
                          setPriceRange([priceRange[0], newMax]);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Deals Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3">Special Offers</h3>
                <label className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={dealsOnly}
                    onChange={(e) => {
                      setDealsOnly(e.target.checked);
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm ml-2 font-medium">Deals Only</span>
                </label>
              </div>

              {/* Sort Options */}
              <div>
                <h3 className="font-bold text-sm mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-4">
            {/* Mobile Filter and Brand Selection */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded w-full"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* Mobile Brand Filter */}
              <BrandFilter
                brands={brands}
                selectedBrands={brandFilter}
                onBrandToggle={(brandName) => {
                  setBrandFilter(prevBrands =>
                    prevBrands.includes(brandName)
                      ? prevBrands.filter(b => b !== brandName)
                      : [...prevBrands, brandName]
                  );
                }}
                isLoading={brandsLoading}
                compact={true}
                error={brandsError}
              />
            </div>

            {/* Brand Filter - Desktop View */}
            <div className="hidden lg:block mb-6">
              <BrandFilter
                brands={brands}
                selectedBrands={brandFilter}
                onBrandToggle={(brandName) => {
                  setBrandFilter(prevBrands =>
                    prevBrands.includes(brandName)
                      ? prevBrands.filter(b => b !== brandName)
                      : [...prevBrands, brandName]
                  );
                }}
                isLoading={brandsLoading}
                compact={false}
                error={brandsError}
              />
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Products Count */}
            <div className="mb-4 text-sm text-gray-600 flex items-center justify-between gap-3 flex-wrap">
              <span>
                Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </span>
              {filteredProducts.length > PRODUCTS_PER_PAGE && (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {/* Products Grid */}
            {allDisplayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-4">
                {allDisplayedProducts.map((product: Product, idx: number) => {
                  const price = product.price !== null && product.price !== undefined 
                    ? parseFloat(String(product.price))
                    : 0;
                  const discount = product.discount ? parseFloat(String(product.discount)) : null;
                  const discountPercentage = discount ? Math.round(((discount - price) / discount) * 100) : 0;
                  const stock = Number(product.stock ?? 0);
                  return (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <div className="group cursor-pointer">
                        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden h-40 md:h-48 mb-3 flex items-center justify-center">
                          {product.cover_image_url ? (
                            <img
                              src={getHighResImageUrl(product.cover_image_url)}
                              alt={product.title}
                              className="w-full h-full object-contain p-3"
                              loading="lazy"
                              decoding="async"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-gray-400 text-center text-sm">No image available</div>
                          )}
                          {discount && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                              -{discountPercentage}%
                            </div>
                          )}
                          <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold ${stock === 0 ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-800'}`}>
                            {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                          </div>
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={async (e) => {
                                e.preventDefault();

                                if (!isAuthenticated || !user?.id) {
                                  openAuthModal('login', 'wishlist', {
                                    type: 'wishlist',
                                    productId: product.id,
                                  });
                                  return;
                                }

                                try {
                                  await toggleWishlist(product.id);
                                } catch (error) {
                                  console.error('Failed to toggle wishlist from products page:', error);
                                }
                              }}
                              className="bg-white p-2 rounded-full hover:bg-gray-100 shadow"
                              aria-label={wishedProductIds.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                              <Heart
                                className={`w-4 h-4 ${wishedProductIds.has(product.id) ? 'text-red-500' : 'text-gray-600'}`}
                                fill={wishedProductIds.has(product.id) ? 'currentColor' : 'none'}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setQuickViewProductId(product.id);
                              }}
                              className="bg-white p-2 rounded-full hover:bg-gray-100 shadow"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-xs md:text-sm font-medium line-clamp-2 group-hover:text-blue-600">{product.title}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-bold text-xs md:text-sm">${price.toFixed(2)}</p>
                          {discount && (
                            <p className="text-gray-500 line-through text-xs">${discount.toFixed(2)}</p>
                          )}
                        </div>
                        <p className={`mt-1 text-xs font-semibold ${stock === 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                {fallbackResult ? (
                  <div>
                    <p className="text-blue-600 text-lg font-semibold mb-2">
                      {fallbackResult.reason === 'similar' 
                        ? '🔍 Similar Products' 
                        : '👁️ Recently Viewed'}
                    </p>
                    <p className="text-gray-600 text-base mb-6">
                      {fallbackResult.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-lg">No products found</p>
                )}
              </div>
            )}

            {filteredProducts.length > PRODUCTS_PER_PAGE && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.max(1, page - 1));
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter((page) => {
                        if (totalPages <= 7) return true;
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                      })
                      .reduce<Array<number | string>>((acc, page, _, array) => {
                        const previous = acc[acc.length - 1];
                        if (typeof previous === 'number' && typeof page === 'number' && page - previous > 1) {
                          acc.push('ellipsis');
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === 'ellipsis' ? (
                            <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-500">...</span>
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => {
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
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.min(totalPages, page + 1));
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Quick View Modal */}
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
