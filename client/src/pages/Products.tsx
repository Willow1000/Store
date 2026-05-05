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
import { useProducts, useSearchProducts, useCategories, useProductsBySlug } from '@/hooks/useSupabaseProducts';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { getHighResImageUrl } from '@/lib/images';
import { getBrandSuggestions, getModelSuggestions } from '@/lib/productSearch';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';

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
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(null);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { products: allProducts, isLoading } = useProducts(1, 300);
  const { results: searchResults, isLoading: isSearching } = useSearchProducts(searchQuery);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  const { categories, isLoading: categoriesLoading } = useCategories();
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

  const selectedCategoryName = normalizeCategoryValue(String(selectedCategory?.name ?? ''));
  const selectedCategorySlug = normalizeCategoryValue(String(selectedCategory?.slug ?? ''));

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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!baseProducts) return [];

    let filtered = baseProducts.filter((p) => {
      const price = parseFloat(String(p.price));
      const priceMatch = price >= priceRange[0] && price <= priceRange[1];
      
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

      // Brand filter
      let brandMatch = true;
      if (brandFilter.length > 0) {
        brandMatch = brandFilter.some(
          b => (p.brand || '').toLowerCase() === b.toLowerCase()
        );
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
        stockMatch = p.stock > 0;
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
          const aPrice = parseFloat(String(a.price));
          const bPrice = parseFloat(String(b.price));
          return aPrice - bPrice;
        });
        break;
      case 'price-high':
        filtered.sort((a, b) => {
          const aPrice = parseFloat(String(a.price));
          const bPrice = parseFloat(String(b.price));
          return bPrice - aPrice;
        });
        break;
      case 'popular':
        // Keep original order for popular
        break;
      case 'newest':
      default:
        // Keep original order
        break;
    }

    return filtered;
  }, [baseProducts, sortBy, priceRange, categoryFilter, selectedCategory, selectedCategoryName, selectedCategorySlug, dealsOnly, brandFilter, modelFilter, conditionFilter, inStockOnly]);

  const itemsPerPage = 12;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
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
                  setCurrentPage(1);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                        setCurrentPage(1);
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
                      const isSelected =
                        categoryQueryValue === normalizedCategoryValue ||
                        categoryQueryValue === normalizeCategoryValue(String(cat.name ?? ''));
                      
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
                              setCurrentPage(1);
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
                            setCurrentPage(1);
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
                            setCurrentPage(1);
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
                <div className="space-y-2">
                  {['new', 'like-new', 'good', 'fair', 'used'].map((condition) => {
                    const hasProducts = allProducts && allProducts.some(p => p.condition === condition);
                    return (
                      <label 
                        key={condition}
                        className={`flex items-center cursor-pointer p-2 rounded transition-colors ${
                          hasProducts ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'
                        }`}
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
                            setCurrentPage(1);
                          }}
                          disabled={!hasProducts}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm ml-2 capitalize">{condition}</span>
                      </label>
                    );
                  })}
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
                      setCurrentPage(1);
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
                      max="10000"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value);
                        if (newMin <= priceRange[1]) {
                          setPriceRange([newMin, priceRange[1]]);
                          setCurrentPage(1);
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
                      max="10000"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value);
                        if (newMax >= priceRange[0]) {
                          setPriceRange([priceRange[0], newMax]);
                          setCurrentPage(1);
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
                      setCurrentPage(1);
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
                    setCurrentPage(1);
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
          <div className="lg:col-span-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Products Count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
            </div>

            {/* Products Grid */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                {paginatedProducts.map((product, idx) => {
                  const price = parseFloat(String(product.price));
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
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {/* Mobile: Show limited pages */}
                <div className="md:hidden flex gap-1 flex-wrap justify-center">
                  {currentPage > 1 && (
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      1
                    </button>
                  )}
                  {currentPage > 2 && <span className="px-1 py-2 text-xs">...</span>}
                  {currentPage > 1 && (
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {currentPage - 1}
                    </button>
                  )}
                  <button className="px-2 py-2 text-xs bg-blue-600 text-white rounded">
                    {currentPage}
                  </button>
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {currentPage + 1}
                    </button>
                  )}
                  {currentPage < totalPages - 1 && <span className="px-1 py-2 text-xs">...</span>}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  )}
                </div>
                
                {/* Desktop: Show all pages */}
                <div className="hidden md:flex gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-2 rounded ${
                        currentPage === i + 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
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
