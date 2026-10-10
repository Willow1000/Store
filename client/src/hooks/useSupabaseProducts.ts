import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getHighResImageUrl } from "@/lib/images";
import { Product, ProductImage } from "@/types/supabase";
import { toast } from "sonner";
import {
  searchProducts,
  filterProducts,
  sortProducts,
} from "@/lib/productSearch";
import { isTimeoutError, recoverFromTimeout } from "@/lib/sessionRecovery";
import { isHydrating, useSsrPageData } from "@/lib/ssrPageData";

const PRODUCTS_CACHE_KEY = "products_cache_v2";
const CATEGORIES_CACHE_KEY = "categories_cache_v2";

function readCachedArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

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
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/availability issues and keep runtime data.
  }
}

/**
 * A list hook's first value. While hydrating it must be exactly what the
 * server rendered with; afterwards the server's list (if any) is stale and the
 * local cache is the better head start.
 */
function initialListing(
  ssrProducts: Product[] | undefined,
  hasSsrData: boolean
): Product[] {
  if (hasSsrData && isHydrating()) return ssrProducts ?? [];
  const cached = readCachedArray<Product>(PRODUCTS_CACHE_KEY);
  return cached.length ? cached : (ssrProducts ?? []);
}

export function useProducts(
  page = 1,
  limit = 20,
  options?: {
    enableRealtime?: boolean;
  }
) {
  // The server's listing comes first: it is what the server rendered, so
  // starting from it keeps hydration consistent (and gives the server render
  // real products); the cache is only used for client-only renders.
  const ssrData = useSsrPageData();
  const [products, setProducts] = useState<Product[]>(() =>
    initialListing(ssrData?.listing?.products, Boolean(ssrData))
  );
  const [isLoading, setIsLoading] = useState(() => products.length === 0);
  const [error, setError] = useState<string | null>(null);
  const enableRealtime = options?.enableRealtime ?? true;

  const fetchProducts = useCallback(
    async (limit = 20, offset = 0) => {
      try {
        setIsLoading(products.length === 0);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error("Products fetch timed out. Please refresh the page.")
              ),
            15000
          )
        );

        // Race between the actual fetch and the timeout
        const fetchPromise = (async () => {
          const query = supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

          // If limit is -1, fetch all products (no range). Otherwise use range for pagination.
          if (limit === -1) {
            const { data, error: supabaseError } = await query.limit(1000);
            if (supabaseError) throw supabaseError;
            return (data || []) as Product[];
          }

          const { data, error: supabaseError } = await query.range(
            offset,
            offset + limit - 1
          );
          if (supabaseError) throw supabaseError;
          return data as Product[];
        })();

        const fetchedProducts = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Product[];

        // Normalize cover image URLs so webp and storage paths resolve correctly
        const normalized = (fetchedProducts || []).map(p => ({
          ...p,
          cover_image_url: getHighResImageUrl(p?.cover_image_url || ""),
        }));
        setProducts(normalized);
        writeCachedArray(PRODUCTS_CACHE_KEY, normalized);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch products";
        setError(message);
        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [products.length]
  );

  // Realtime subscription: update products list when DB changes occur
  useEffect(() => {
    if (!enableRealtime) return;

    try {
      const channel = supabase
        .channel("public:products")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          payload => {
            try {
              const record = payload?.new || payload?.old;
              if (!record) return;
              const recordId = (record as any).id;

              const normalizedRecord: Product = {
                ...record,
                cover_image_url: getHighResImageUrl(
                  (record as any).cover_image_url || ""
                ),
              } as Product;

              setProducts(prev => {
                if (!prev) return [normalizedRecord];

                switch (payload.eventType) {
                  case "INSERT":
                  case "UPDATE": {
                    // Replace existing or add new at front for newest-first ordering
                    const idx = prev.findIndex(
                      p => String(p.id) === String(normalizedRecord.id)
                    );
                    if (idx === -1) {
                      const next = [normalizedRecord, ...prev];
                      writeCachedArray(PRODUCTS_CACHE_KEY, next);
                      return next;
                    }
                    const next = prev.slice();
                    next[idx] = { ...next[idx], ...normalizedRecord };
                    writeCachedArray(PRODUCTS_CACHE_KEY, next);
                    return next;
                  }
                  case "DELETE": {
                    const next = prev.filter(
                      p => String(p.id) !== String(recordId)
                    );
                    writeCachedArray(PRODUCTS_CACHE_KEY, next);
                    return next;
                  }
                  default:
                    return prev;
                }
              });
            } catch {}
          }
        )
        .subscribe();

      return () => {
        try {
          channel.unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    } catch {}
  }, [enableRealtime]);

  useEffect(() => {
    const offset = limit === -1 ? 0 : (page - 1) * limit;
    fetchProducts(limit, offset);
  }, [fetchProducts, page, limit]);

  return { products, isLoading, error, refetch: fetchProducts };
}

export function useProductById(productId: string) {
  const ssrProduct = useSsrPageData()?.product;
  const ssrMatch =
    ssrProduct && String(ssrProduct.product.id) === productId
      ? ssrProduct
      : null;
  const [product, setProduct] = useState<Product | null>(
    () => ssrMatch?.product ?? null
  );
  const [images, setImages] = useState<ProductImage[]>(
    () => ssrMatch?.images ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !ssrMatch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) {
        setIsLoading(false);
        return;
      }

      try {
        // The server rendered this product: show its data (again, if the
        // visitor navigated away and back) and refresh it in the background
        // instead of flashing the loading skeleton.
        if (ssrMatch) {
          setProduct(ssrMatch.product);
          setImages(ssrMatch.images);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error("Product fetch timed out. Please refresh the page.")
              ),
            15000
          )
        );

        // Race between the actual fetch and the timeout
        const fetchPromise = (async () => {
          // Fetch product
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .maybeSingle();

          if (productError) throw productError;

          if (!productData) {
            // Legacy fallback for numeric product routes that originated from older JSON catalog links.
            const numericId = Number(productId);
            if (Number.isFinite(numericId) && numericId > 0) {
              const res = await fetch("/data/products.json");
              if (!res.ok) {
                throw new Error("Product not found");
              }

              const json = await res.json();
              const flattened = Object.values(json as Record<string, any[]>)
                .flat()
                .map((item: any, idx: number) => ({
                  id: String(idx + 1),
                  title: String(item?.title || "Product"),
                  category_name: String(item?.category || "General"),
                  owner_id: null,
                  price: Number(
                    String(item?.price || "0").replace(/[^\d.]/g, "") || 0
                  ),
                  original_price: undefined,
                  condition: "used",
                  cover_image_url: String(item?.image_urls?.[0] || ""),
                  brand: null,
                  model: null,
                  stock: 1,
                  discount: null,
                  part_number: null,
                  item_specifics: null,
                  created_at: new Date().toISOString(),
                }));

              const fallbackProduct = flattened[numericId - 1] as
                | Product
                | undefined;
              if (!fallbackProduct) {
                throw new Error("Product not found");
              }

              setProduct(fallbackProduct);
              setImages(
                (
                  (json &&
                    Object.values(json as Record<string, any[]>).flat()[
                      numericId - 1
                    ]?.image_urls) ||
                  []
                ).map((url: string, i: number) => ({
                  id: `legacy-${numericId}-${i}`,
                  product_id: fallbackProduct.id,
                  image_url: url,
                  created_at: new Date().toISOString(),
                })) as ProductImage[]
              );
              return;
            }

            throw new Error("Product not found");
          }

          // Fetch brand details if brand exists
          let productWithBrand: Product = productData as Product;
          if (productData?.brand) {
            try {
              const { data: brandData, error: brandError } = await supabase
                .from("brand")
                .select("*")
                .eq("name", productData.brand)
                .single();

              if (!brandError && brandData) {
                productWithBrand = {
                  ...productData,
                  brand_details:
                    brandData as typeof productWithBrand.brand_details,
                };
              }
            } catch {}
          }

          // Normalize product cover image
          const normalizedProduct = {
            ...productWithBrand,
            cover_image_url: getHighResImageUrl(
              productWithBrand?.cover_image_url || ""
            ),
          } as Product;

          setProduct(normalizedProduct);

          // Fetch product images
          const { data: imagesData, error: imagesError } = await supabase
            .from("product_images")
            .select("*")
            .eq("product_id", productId);

          // The product itself has loaded: a failed gallery query must not
          // replace the whole page with an error. Keep whatever images are
          // already shown.
          if (imagesError) return;

          // Normalize image URLs
          const normalizedImages = (imagesData || []).map((img: any) => ({
            ...img,
            image_url: getHighResImageUrl(img.image_url),
          })) as ProductImage[];

          setImages(normalizedImages);
        })();

        // Wait for whichever completes first (fetch or timeout)
        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        // The server already rendered this product and this was only the
        // background refresh. A slow or failed refresh used to swap the
        // working page for "Product fetch timed out" / "Product Not
        // Available" (and a noindex tag); keep the server's data instead.
        if (ssrMatch) return;
        const message =
          err instanceof Error ? err.message : "Failed to fetch product";
        setError(message);
        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }
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
            () =>
              reject(
                new Error("Products fetch timed out. Please refresh the page.")
              ),
            15000
          )
        );

        const fetchPromise = (async () => {
          const { data, error: supabaseError } = await supabase
            .from("products")
            .select("*")
            .eq("category_name", categoryName)
            .order("created_at", { ascending: false })
            .limit(1000);

          if (supabaseError) throw supabaseError;
          return data as Product[];
        })();

        const fetchedProducts = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Product[];
        setProducts(fetchedProducts);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch products";
        setError(message);
        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }
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
            () => reject(new Error("Search timed out. Please try again.")),
            15000
          )
        );

        const fetchPromise = (async () => {
          // First, try to get exact matches using Supabase full-text search
          // Search across title, brand, model, and condition fields
          const { data, error: supabaseError } = await supabase
            .from("products")
            .select("*")
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
              .from("products")
              .select("*")
              .limit(500);
            if (allError) throw allError;
            productsToSearch = (allData || []) as Product[];
          }

          return productsToSearch;
        })();

        const allProducts = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Product[];

        // Apply comprehensive client-side search with relevance scoring
        const searchedProducts = searchProducts(allProducts, searchTerm, {
          includePartNumbers: true,
          includeSimilar: true, // This ensures similar products show if no exact matches
          maxResults: 100,
        });

        setResults(searchedProducts);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
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
  const ssrData = useSsrPageData();
  const [categories, setCategories] = useState<Category[]>(() => {
    if (ssrData?.categories?.length) return ssrData.categories;
    if (ssrData && isHydrating()) return [];
    return readCachedArray<Category>(CATEGORIES_CACHE_KEY);
  });
  const [isLoading, setIsLoading] = useState(() => categories.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(categories.length === 0);
        setError(null);

        // Create a timeout promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Categories fetch timed out. Please refresh the page."
                )
              ),
            15000
          )
        );

        const fetchPromise = (async () => {
          const { data, error: supabaseError } = await supabase
            .from("categories")
            .select("id,name,slug,description,icon,image_url,created_at")
            .order("name", { ascending: true });

          if (supabaseError) throw supabaseError;
          return data as Category[];
        })();

        const fetchedCategories = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Category[];
        setCategories(fetchedCategories);
        writeCachedArray(CATEGORIES_CACHE_KEY, fetchedCategories);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch categories";
        setError(message);
        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, [categories.length]);

  return { categories, isLoading, error };
}

export function useProductsBySlug(categorySlug: string) {
  const ssrListing = useSsrPageData()?.listing;
  const ssrMatch =
    ssrListing?.categorySlug &&
    ssrListing.categorySlug.toLowerCase() === categorySlug.trim().toLowerCase()
      ? ssrListing.products
      : null;
  const [products, setProducts] = useState<Product[]>(() => ssrMatch ?? []);
  const [isLoading, setIsLoading] = useState(() => !ssrMatch);
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
            () =>
              reject(
                new Error("Products fetch timed out. Please refresh the page.")
              ),
            15000
          )
        );

        const fetchPromise = (async () => {
          // First, get the category by slug to get its name. Links around
          // the site pass the category NAME as often as the slug (product
          // breadcrumbs do), and the two differ - "Engines" has the slug
          // "engine" - so fall back to matching the name.
          const bySlug = await supabase
            .from("categories")
            .select("name")
            .eq("slug", categorySlug)
            .maybeSingle();
          if (bySlug.error) throw bySlug.error;

          let categoryData = bySlug.data;
          if (!categoryData) {
            const byName = await supabase
              .from("categories")
              .select("name")
              .ilike("name", categorySlug.replace(/[%_\\]/g, "\\$&"))
              .limit(1)
              .maybeSingle();
            if (byName.error) throw byName.error;
            categoryData = byName.data;
          }
          if (!categoryData) throw new Error("Category not found");

          // Then fetch products by category_name
          const { data, error: supabaseError } = await supabase
            .from("products")
            .select("*")
            .eq("category_name", categoryData.name)
            .order("created_at", { ascending: false })
            .limit(1000);

          if (supabaseError) throw supabaseError;
          return data as Product[];
        })();

        const fetchedProducts = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Product[];
        setProducts(fetchedProducts);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch products";
        setError(message);
        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [categorySlug]);

  return { products, isLoading, error };
}
