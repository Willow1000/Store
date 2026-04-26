import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductImage } from '@/types/supabase';
import { toast } from 'sonner';

export function useProducts(page = 1, limit = 20) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (limit = 20, offset = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (supabaseError) throw supabaseError;

      setProducts(data as Product[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

        // Fetch product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        
        console.log('[useProductById] Product fetched:', {
          id: productData?.id,
          title: productData?.title,
          cover_image_url: productData?.cover_image_url
        });
        
        setProduct(productData as Product);

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

        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .eq('category_name', categoryName)
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;

        setProducts(data as Product[]);
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
    const searchProducts = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .or(`title.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;

        setResults(data as Product[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (supabaseError) throw supabaseError;

        setCategories(data as Category[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch categories';
        setError(message);
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

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

        // First, get the category by slug to get its ID
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();

        if (categoryError) throw categoryError;

        // Then fetch products by category ID
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryData.id)
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;

        setProducts(data as Product[]);
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
