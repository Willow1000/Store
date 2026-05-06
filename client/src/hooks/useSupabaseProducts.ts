import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductImage } from '@/types/supabase';
import { toast } from 'sonner';
import { searchProducts, filterProducts, sortProducts } from '@/lib/productSearch';

const PRODUCTS_CACHE_KEY = 'products_cache_v1';
const CATEGORIES_CACHE_KEY = 'categories_cache_v1';

function readCachedArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeCachedArray<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/availability issues and keep runtime data.
  }
}

export function useProducts(page = 1, limit = 20) {
  const [products, setProducts] = useState<Product[]>(() => readCachedArray<Product>(PRODUCTS_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(() => readCachedArray<Product>(PRODUCTS_CACHE_KEY).length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (limit = 20, offset = 0) => {
    try {
      setIsLoading(products.length === 0);
      setError(null);

      // Create a timeout promise that rejects after 15 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Products fetch timed out. Please refresh the page.')),
          15000
        )
      );

      // Race between the actual fetch and the timeout
      const fetchPromise = (async () => {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (supabaseError) throw supabaseError;
        return data as Product[];
      })();

      const fetchedProducts = await Promise.race([fetchPromise, timeoutPromise]) as Product[];
      setProducts(fetchedProducts);
      writeCachedArray(PRODUCTS_CACHE_KEY, fetchedProducts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    const offset = (page - 1) * limit;
    fetchProducts(limit, offset);
  }, [fetchProducts, page, limit]);

  return { products, isLoading, error, refetch: fetchProducts };
}

export function useProductById(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('[useProductById] Fetching product:', productId);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Product fetch timed out. Please refresh the page.')),
            15000
          )
        );

        // Race between the actual fetch and the timeout
        const fetchPromise = (async () => {
          // Fetch product
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .maybeSingle();

          if (productError) throw productError;

          if (!productData) {
            // Legacy fallback for numeric product routes that originated from older JSON catalog links.
            const numericId = Number(productId);
            if (Number.isFinite(numericId) && numericId > 0) {
              const res = await fetch('/data/products.json');
              if (!res.ok) {
                throw new Error('Product not found');
              }

              const json = await res.json();
              const flattened = Object.values(json as Record<string, any[]>)
                .flat()
                .map((item: any, idx: number) => ({
                  id: String(idx + 1),
                  title: String(item?.title || 'Product'),
                  url: String(item?.url || ''),
                  category_name: String(item?.category || 'General'),
                  owner_id: null,
                  price: Number(String(item?.price || '0').replace(/[^\d.]/g, '') || 0),
                  original_price: undefined,
                  condition: 'used',
                  cover_image_url: String(item?.image_urls?.[0] || ''),
                  brand: null,
                  model: null,
                  stock: 1,
                  discount: null,
                  part_number: null,
                  item_specifics: null,
                  created_at: new Date().toISOString(),
                }));

              const fallbackProduct = flattened[numericId - 1] as Product | undefined;
              if (!fallbackProduct) {
                throw new Error('Product not found');
              }

              setProduct(fallbackProduct);
              setImages(
                (json && Object.values(json as Record<string, any[]>).flat()[numericId - 1]?.image_urls || []).map(
                  (url: string, i: number) => ({
                    id: `legacy-${numericId}-${i}`,
                    product_id: fallbackProduct.id,
                    image_url: url,
                    created_at: new Date().toISOString(),
                  })
                ) as ProductImage[]
              );
              return;
            }

            throw new Error('Product not found');
          }
          
          console.log('[useProductById] Product fetched:', {
            id: productData?.id,
            title: productData?.title,
            cover_image_url: productData?.cover_image_url
          });
          
          // Fetch brand details if brand exists
          let productWithBrand: Product = productData as Product;
          if (productData?.brand) {
            try {
              const { data: brandData, error: brandError } = await supabase
                .from('Brand')
                .select('*')
                .eq('name', productData.brand)
                .single();

              if (!brandError && brandData) {
                productWithBrand = {
                  ...productData,
                  brand_details: brandData as typeof productWithBrand.brand_details
                };
                console.log('[useProductById] Brand details fetched:', {
                  name: brandData.name,
                  image_url: brandData.image_url
                });
              }
            } catch (err) {
              console.warn('[useProductById] Failed to fetch brand details:', err);
            }
          }
          
          setProduct(productWithBrand);

          // Fetch product images
          const { data: imagesData, error: imagesError } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', productId);

          if (imagesError) throw imagesError;
          
          console.log('[useProductById] Product images fetched:', {
            count: imagesData?.length,
            urls: imagesData?.map(img => img.image_url)
          });
          
          setImages(imagesData as ProductImage[]);
        })();

        // Wait for whichever completes first (fetch or timeout)
        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch product';
        setError(message);
        console.error('[useProductById] Error fetching product:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [productId]);

  return { product, images, isLoading, error };
}

export function useProductsByCategory(categoryName: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Products fetch timed out. Please refresh the page.')),
            15000
          )
        );

        const fetchPromise = (async () => {
          const { data, error: supabaseError } = await supabase
            .from('products')
            .select('*')
            .eq('category_name', categoryName)
            .order('created_at', { ascending: false });

          if (supabaseError) throw supabaseError;
          return data as Product[];
        })();

        const fetchedProducts = await Promise.race([fetchPromise, timeoutPromise]) as Product[];
        setProducts(fetchedProducts);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch products';
        setError(message);
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (categoryName) {
      fetchProducts();
    }
  }, [categoryName]);

  return { products, isLoading, error };
}

export function useSearchProducts(searchTerm: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchProducts_impl = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Search timed out. Please try again.')),
            15000
          )
        );

        const fetchPromise = (async () => {
          // First, try to get exact matches using Supabase full-text search
          // Search across title, brand, model, and condition fields
          const { data, error: supabaseError } = await supabase
            .from('products')
            .select('*')
            .or(
              `title.ilike.%${searchTerm}%,` +
              `brand.ilike.%${searchTerm}%,` +
              `model.ilike.%${searchTerm}%,` +
              `category_name.ilike.%${searchTerm}%,` +
              `condition.ilike.%${searchTerm}%,` +
              `part_number.ilike.%${searchTerm}%`
            )
            .limit(300); // Fetch more for local scoring

          if (supabaseError) throw supabaseError;
          
          // If no results, fetch more products for client-side similarity matching
          let productsToSearch = (data || []) as Product[];
          if (productsToSearch.length === 0) {
            const { data: allData, error: allError } = await supabase
              .from('products')
              .select('*')
              .limit(500);
            if (allError) throw allError;
            productsToSearch = (allData || []) as Product[];
          }

          return productsToSearch;
        })();

        let allProducts = await Promise.race([fetchPromise, timeoutPromise]) as Product[];

        // Apply comprehensive client-side search with relevance scoring
        const searchedProducts = searchProducts(allProducts, searchTerm, {
          includePartNumbers: true,
          includeSimilar: true, // This ensures similar products show if no exact matches
          maxResults: 100,
        });

        console.log('[useSearchProducts] Search term:', searchTerm);
        console.log('[useSearchProducts] Results found:', searchedProducts.length);
        
        setResults(searchedProducts);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts_impl, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return { results, isLoading, error };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() => readCachedArray<Category>(CATEGORIES_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(() => readCachedArray<Category>(CATEGORIES_CACHE_KEY).length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(categories.length === 0);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Categories fetch timed out. Please refresh the page.')),
            15000
          )
        );

        const fetchPromise = (async () => {
          const { data, error: supabaseError } = await supabase
            .from('categories')
            .select('id,name,slug,description,icon,image_url,created_at')
            .order('name', { ascending: true });

          if (supabaseError) throw supabaseError;
          return data as Category[];
        })();

        const fetchedCategories = await Promise.race([fetchPromise, timeoutPromise]) as Category[];
        console.log('[useCategories] Fetched categories:', fetchedCategories);
        setCategories(fetchedCategories);
        writeCachedArray(CATEGORIES_CACHE_KEY, fetchedCategories);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch categories';
        setError(message);
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, [categories.length]);

  return { categories, isLoading, error };
}

export function useProductsBySlug(categorySlug: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      if (!categorySlug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Products fetch timed out. Please refresh the page.')),
            15000
          )
        );

        const fetchPromise = (async () => {
          // First, get the category by slug to get its name
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('name')
            .eq('slug', categorySlug)
            .single();

          if (categoryError) throw categoryError;

          // Then fetch products by category_name
          const { data, error: supabaseError } = await supabase
            .from('products')
            .select('*')
            .eq('category_name', categoryData.name)
            .order('created_at', { ascending: false });

          if (supabaseError) throw supabaseError;
          return data as Product[];
        })();

        const fetchedProducts = await Promise.race([fetchPromise, timeoutPromise]) as Product[];
        setProducts(fetchedProducts);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch products';
        setError(message);
        console.error('Error fetching products by slug:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [categorySlug]);

  return { products, isLoading, error };
}
