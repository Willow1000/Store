/**
 * Advanced product search and filtering utilities
 * Searches across all product fields including Brand, Model, itemSpecifics, etc.
 * Uses relevance scoring to return most relevant results first
 */

import { Product } from '@/types/supabase';

export interface SearchOptions {
  includePartNumbers?: boolean;
  includeSimilar?: boolean;
  maxResults?: number;
}

/**
 * Calculate relevance score for a product based on search term
 * Higher score = more relevant match
 */
export function calculateRelevanceScore(product: Product, searchTerm: string): number {
  if (!searchTerm.trim()) return 0;

  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(w => w.length > 0);
  let score = 0;

  // Title match (highest priority)
  const titleLower = (product.title || '').toLowerCase();
  if (titleLower === term) score += 100; // Exact match
  if (titleLower.startsWith(term)) score += 80; // Starts with
  if (titleLower.includes(term)) score += 60; // Contains full term
  
  // Word-by-word matching in title
  words.forEach(word => {
    if (titleLower.includes(word)) score += 15;
  });

  // Brand match (high priority)
  const brandLower = (product.brand || '').toLowerCase();
  if (brandLower === term) score += 80;
  if (brandLower.includes(term)) score += 50;
  words.forEach(word => {
    if (brandLower.includes(word)) score += 10;
  });

  // Model match (high priority)
  const modelLower = (product.model || '').toLowerCase();
  if (modelLower === term) score += 70;
  if (modelLower.includes(term)) score += 45;
  words.forEach(word => {
    if (modelLower.includes(word)) score += 8;
  });

  // Condition match
  const conditionLower = (product.condition || '').toLowerCase();
  if (conditionLower.includes(term)) score += 25;

  // Part number match
  const partNumberLower = (product.part_number || '').toLowerCase();
  if (partNumberLower === term) score += 50;
  if (partNumberLower.includes(term)) score += 30;

  // Category match
  const categoryLower = (product.category_name || '').toLowerCase();
  if (categoryLower.includes(term)) score += 20;

  // Item specifics match (if available)
  if (product.item_specifics && typeof product.item_specifics === 'object') {
    const specificsStr = JSON.stringify(product.item_specifics).toLowerCase();
    if (specificsStr.includes(term)) score += 15;
  }

  return score;
}

/**
 * Search products across all fields with relevance scoring
 */
export function searchProducts(
  products: Product[],
  searchTerm: string,
  options: SearchOptions = {}
): Product[] {
  const {
    includePartNumbers = true,
    includeSimilar = true,
    maxResults = Infinity,
  } = options;

  if (!searchTerm.trim()) return products;

  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(w => w.length > 0);

  // Score all products
  const scored = products.map(product => ({
    product,
    score: calculateRelevanceScore(product, searchTerm),
  }));

  // Filter out products with no relevance
  let results = scored.filter(({ score }) => score > 0);

  // If no exact matches and includeSimilar is true, add similar products
  if (results.length === 0 && includeSimilar) {
    results = scored
      .map(item => ({
        ...item,
        score: calculateSimilarityScore(item.product, words),
      }))
      .filter(({ score }) => score > 0);
  }

  // Sort by relevance (highest score first)
  results.sort((a, b) => b.score - a.score);

  // Extract products only
  return results.slice(0, maxResults).map(({ product }) => product);
}

/**
 * Calculate similarity score for products when no exact matches found
 * Uses word-by-word matching with partial credit
 */
function calculateSimilarityScore(product: Product, words: string[]): number {
  if (words.length === 0) return 0;

  const fields = [
    product.title || '',
    product.brand || '',
    product.model || '',
    product.condition || '',
    product.category_name || '',
    product.part_number || '',
  ];

  let totalScore = 0;

  words.forEach(word => {
    let wordScore = 0;

    // Check each field for word matches
    if ((product.title || '').toLowerCase().includes(word)) wordScore += 12;
    if ((product.brand || '').toLowerCase().includes(word)) wordScore += 10;
    if ((product.model || '').toLowerCase().includes(word)) wordScore += 9;
    if ((product.condition || '').toLowerCase().includes(word)) wordScore += 6;
    if ((product.category_name || '').toLowerCase().includes(word)) wordScore += 5;
    if ((product.part_number || '').toLowerCase().includes(word)) wordScore += 8;

    // Check item specifics
    if (product.item_specifics && typeof product.item_specifics === 'object') {
      const specificsStr = JSON.stringify(product.item_specifics).toLowerCase();
      if (specificsStr.includes(word)) wordScore += 4;
    }

    totalScore += Math.min(wordScore, 15); // Cap individual word score
  });

  return totalScore;
}

/**
 * Filter products by all available fields
 * Returns products that match all specified criteria
 */
export function filterProducts(
  products: Product[],
  filters: {
    priceRange?: [number, number];
    brands?: string[];
    models?: string[];
    conditions?: string[];
    categories?: string[];
    inStock?: boolean;
    onSaleOnly?: boolean;
  }
): Product[] {
  return products.filter(product => {
    // Price filter
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      const price = parseFloat(String(product.price));
      if (price < minPrice || price > maxPrice) return false;
    }

    // Brand filter
    if (filters.brands && filters.brands.length > 0) {
      const brandMatch = filters.brands.some(
        b => (product.brand || '').toLowerCase() === b.toLowerCase()
      );
      if (!brandMatch) return false;
    }

    // Model filter
    if (filters.models && filters.models.length > 0) {
      const modelMatch = filters.models.some(
        m => (product.model || '').toLowerCase() === m.toLowerCase()
      );
      if (!modelMatch) return false;
    }

    // Condition filter
    if (filters.conditions && filters.conditions.length > 0) {
      const conditionMatch = filters.conditions.some(
        c => (product.condition || '').toLowerCase() === c.toLowerCase()
      );
      if (!conditionMatch) return false;
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      const categoryMatch = filters.categories.some(
        cat => (product.category_name || '').toLowerCase() === cat.toLowerCase()
      );
      if (!categoryMatch) return false;
    }

    // In stock filter
    if (filters.inStock && product.stock === 0) return false;

    // On sale filter
    if (filters.onSaleOnly && (!product.discount || product.discount === 0)) return false;

    return true;
  });
}

/**
 * Get brand suggestions from products based on partial match
 */
export function getBrandSuggestions(products: Product[], partial: string): string[] {
  const seen = new Set<string>();
  const partial_lower = partial.toLowerCase();

  return products
    .filter(p => p.brand && p.brand.toLowerCase().includes(partial_lower))
    .map(p => p.brand!)
    .filter(brand => {
      if (seen.has(brand)) return false;
      seen.add(brand);
      return true;
    })
    .sort();
}

/**
 * Get model suggestions from products based on partial match
 */
export function getModelSuggestions(products: Product[], partial: string): string[] {
  const seen = new Set<string>();
  const partial_lower = partial.toLowerCase();

  return products
    .filter(p => p.model && p.model.toLowerCase().includes(partial_lower))
    .map(p => p.model!)
    .filter(model => {
      if (seen.has(model)) return false;
      seen.add(model);
      return true;
    })
    .sort();
}

/**
 * Get products with similar characteristics to a given product
 */
export function getSimilarProducts(
  products: Product[],
  targetProduct: Product,
  limit: number = 6
): Product[] {
  const similar = products
    .filter(p => p.id !== targetProduct.id)
    .map(p => ({
      product: p,
      score: calculateProductSimilarity(p, targetProduct),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return similar.map(({ product }) => product);
}

/**
 * Calculate similarity between two products
 */
function calculateProductSimilarity(product1: Product, product2: Product): number {
  let score = 0;

  // Same category (high importance)
  if (product1.category_name === product2.category_name) score += 40;

  // Same brand
  if (product1.brand && product2.brand && product1.brand === product2.brand) score += 30;

  // Same model
  if (product1.model && product2.model && product1.model === product2.model) score += 25;

  // Same condition
  if (product1.condition === product2.condition) score += 15;

  // Similar price (within 30%)
  const price1 = parseFloat(String(product1.price));
  const price2 = parseFloat(String(product2.price));
  const avgPrice = (price1 + price2) / 2;
  const priceDiff = Math.abs(price1 - price2);
  if (priceDiff <= avgPrice * 0.3) score += 20;

  // Similar title (keyword overlap)
  const titleWords1 = (product1.title || '').toLowerCase().split(/\s+/);
  const titleWords2 = (product2.title || '').toLowerCase().split(/\s+/);
  const commonWords = titleWords1.filter(w => titleWords2.includes(w)).length;
  score += Math.min(commonWords * 5, 20);

  return score;
}

/**
 * Sort products by relevance, price, or newest
 */
export function sortProducts(
  products: Product[],
  sortBy: 'relevance' | 'price-low' | 'price-high' | 'newest' | 'popular' = 'newest'
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low':
      sorted.sort((a, b) => parseFloat(String(a.price)) - parseFloat(String(b.price)));
      break;
    case 'price-high':
      sorted.sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)));
      break;
    case 'newest':
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      break;
    case 'relevance':
    case 'popular':
    default:
      // Keep original order or use rating if available
      break;
  }

  return sorted;
}
