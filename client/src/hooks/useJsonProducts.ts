import { useMemo, useState, useEffect } from 'react';

export interface Product {
  title: string;
  price: string;
  url: string;
  image_urls: string[];
  category: string;
}

export function useJsonProducts() {
  const [data, setData] = useState<{ all: Product[]; byCategory: Record<string, Product[]> }>({
    all: [],
    byCategory: {},
  });

  useEffect(() => {
    fetch('/data/products.json')
      .then((res) => res.json())
      .then((productsData) => {
        if (!productsData || typeof productsData !== 'object') {
          setData({ all: [], byCategory: {} });
          return;
        }

        const all: Product[] = [];
        const byCategory: Record<string, Product[]> = {};

        // Handle both array and object formats
        if (Array.isArray(productsData)) {
          all.push(...productsData);
        } else {
          // Object with categories
          for (const [category, items] of Object.entries(productsData)) {
            if (Array.isArray(items)) {
              all.push(...items);
              byCategory[category] = items;
            }
          }
        }

        setData({ all, byCategory });
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setData({ all: [], byCategory: {} });
      });
  }, []);

  return data;
}

export function useJsonProductsByCategory(category: string) {
  const { byCategory } = useJsonProducts();
  return byCategory[category] || [];
}

export async function getFeaturedProducts(limit: number = 8): Promise<Product[]> {
  try {
    const res = await fetch('/data/products.json');
    const productsData = await res.json();

    if (!productsData || typeof productsData !== 'object') {
      return [];
    }

    const products: Product[] = [];

    if (Array.isArray(productsData)) {
      products.push(...productsData.slice(0, limit));
    } else {
      // Get first few from each category
      const categories = Object.keys(productsData);
      for (const category of categories) {
        const items = productsData[category];
        if (Array.isArray(items)) {
          products.push(...items.slice(0, Math.ceil(limit / categories.length)));
        }
        if (products.length >= limit) break;
      }
    }

    return products.slice(0, limit);
  } catch (err) {
    console.error('Failed to load featured products:', err);
    return [];
  }
}
