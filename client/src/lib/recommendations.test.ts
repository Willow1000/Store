// @vitest-environment jsdom
//
// recommendations.ts is browser-only code (it branches on `typeof window`
// and reads/writes localStorage), so it needs a real DOM environment to
// exercise that code path instead of always hitting the server-side
// fallback.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  scoreProduct,
  rankProducts,
  getRecommendationSessionId,
  type InterestProfile,
  type SmartScoreBreakdown,
  type Product,
} from './recommendations';

/**
 * Mock product fixture for testing
 */
const mockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-001',
  uuid: 'uuid-001',
  title: 'Premium Tire Set',
  name: 'Premium Tire Set',
  brand: 'Michelin',
  category_name: 'Tires',
  price: 450.00,
  sale_price: null,
  stock: 15,
  description: 'High-quality tire set for all seasons',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Mock interest profile for testing
 */
const mockProfile = (overrides: Partial<InterestProfile> = {}): InterestProfile => ({
  version: 1,
  scope: 'guest',
  sessionId: 'test-session-123',
  userId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  brandWeights: { michelin: 45, continental: 30 },
  categoryWeights: { tires: 60, wheels: 40 },
  modelWeights: {},
  vehicleBrandWeights: { toyota: 50, honda: 35 },
  vehicleModelWeights: {},
  termWeights: { 'all-season': 25, 'performance': 15 },
  productWeights: { 'prod-001': 20 },
  eventCounts: { product_view: 15, search: 8 },
  recentSearches: [
    {
      raw: 'michelin tires',
      tokens: ['michelin', 'tires'],
      at: new Date().toISOString(),
    },
  ],
  recentlyViewedProductIds: ['prod-001', 'prod-002'],
  cartProductIds: [],
  purchasedProductIds: ['prod-003'],
  wishlistedProductIds: [],
  ...overrides,
});

describe('Product Scoring and Breakdown', () => {
  beforeEach(() => {
    // Store original localStorage
    if (typeof window !== 'undefined') {
      (window.localStorage as any) = {
        items: {} as Record<string, string>,
        getItem(key: string) {
          return this.items[key] || null;
        },
        setItem(key: string, value: string) {
          this.items[key] = value;
        },
        removeItem(key: string) {
          delete this.items[key];
        },
        clear() {
          this.items = {};
        },
      };
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('scoreProduct', () => {
    it('should score a product with a matching profile', () => {
      const product = mockProduct({ brand: 'Michelin', category_name: 'Tires' });
      const profile = mockProfile({
        brandWeights: { michelin: 50 },
        categoryWeights: { tires: 60 },
        productWeights: { 'prod-001': 20 },
      });

      const result = scoreProduct(product, { profile });

      expect(result.product).toEqual(product);
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.brandAffinity).toBeGreaterThan(0);
      expect(result.breakdown.categoryAffinity).toBeGreaterThan(0);
    });

    it('should calculate search relevance when search term is provided', () => {
      const product = mockProduct({ title: 'Michelin All-Season Tires' });
      const profile = mockProfile();

      const resultWithSearch = scoreProduct(product, {
        profile,
        searchTerm: 'michelin tires',
      });

      const resultWithoutSearch = scoreProduct(product, { profile });

      expect(resultWithSearch.breakdown.searchRelevance).toBeGreaterThan(0);
      expect(resultWithSearch.score).toBeGreaterThan(resultWithoutSearch.score);
    });

    it('should factor in deal score when sale price is lower than regular price', () => {
      // calculateDealScore compares `price` against `original_price`/`discount`
      // (the pre-markdown reference price) - `sale_price` isn't part of that
      // calculation at all.
      const regularProduct = mockProduct({
        price: 450,
        original_price: undefined,
      });

      const dealProduct = mockProduct({
        price: 299.99,
        original_price: 450,
      });

      const profile = mockProfile();

      const regularScore = scoreProduct(regularProduct, { profile });
      const dealScore = scoreProduct(dealProduct, { profile });

      expect(dealScore.breakdown.dealScore).toBeGreaterThan(
        regularScore.breakdown.dealScore
      );
    });

    it('should penalize products with low or no stock', () => {
      const inStockProduct = mockProduct({ stock: 10 });
      const outOfStockProduct = mockProduct({ stock: 0 });
      const profile = mockProfile();

      const inStockScore = scoreProduct(inStockProduct, { profile });
      const outOfStockScore = scoreProduct(outOfStockProduct, { profile });

      expect(inStockScore.breakdown.stock).toBeGreaterThan(0);
      expect(outOfStockScore.breakdown.stock).toBeLessThan(0);
      expect(inStockScore.score).toBeGreaterThan(outOfStockScore.score);
    });

    it('should boost score for previously purchased products', () => {
      const product = mockProduct({ id: 'prod-003' });
      const profileWithPurchase = mockProfile({
        purchasedProductIds: ['prod-003'],
      });
      const profileWithoutPurchase = mockProfile({
        purchasedProductIds: [],
      });

      const scoreWithPurchase = scoreProduct(product, { profile: profileWithPurchase });
      const scoreWithoutPurchase = scoreProduct(product, { profile: profileWithoutPurchase });

      expect(scoreWithPurchase.breakdown.purchaseHistory).toBeGreaterThan(0);
      expect(scoreWithoutPurchase.breakdown.purchaseHistory).toBe(0);
      expect(scoreWithPurchase.score).toBeGreaterThan(scoreWithoutPurchase.score);
    });

    it('should handle products with missing data gracefully', () => {
      const incompleteProduct = mockProduct({
        brand: undefined,
        price: undefined,
        stock: undefined,
      });
      const profile = mockProfile();

      const result = scoreProduct(incompleteProduct, { profile });

      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should return breakdown with all expected fields', () => {
      const product = mockProduct();
      const profile = mockProfile();

      const result = scoreProduct(product, { profile });
      const breakdown = result.breakdown;

      expect(breakdown).toHaveProperty('searchRelevance');
      expect(breakdown).toHaveProperty('brandAffinity');
      expect(breakdown).toHaveProperty('vehicleAffinity');
      expect(breakdown).toHaveProperty('categoryAffinity');
      expect(breakdown).toHaveProperty('purchaseHistory');
      expect(breakdown).toHaveProperty('dealScore');
      expect(breakdown).toHaveProperty('popularity');
      expect(breakdown).toHaveProperty('stock');
      expect(breakdown).toHaveProperty('recency');
      expect(breakdown).toHaveProperty('total');
    });
  });

  describe('rankProducts', () => {
    it('should rank products by score in descending order', () => {
      const products = [
        mockProduct({ id: 'prod-1', brand: 'Michelin', price: 100 }),
        mockProduct({ id: 'prod-2', brand: 'Continental', price: 200 }),
        mockProduct({ id: 'prod-3', brand: 'Bridgestone', price: 150 }),
      ];
      const profile = mockProfile({
        brandWeights: { michelin: 80, continental: 20 },
      });

      const ranked = rankProducts(products, { profile });

      expect(ranked[0].brand).toBe('Michelin');
      expect(ranked).toHaveLength(3);
    });

    it('should handle empty product arrays', () => {
      const result = rankProducts([]);
      expect(result).toEqual([]);
    });

    it('should return unchanged products array if only one product', () => {
      const products = [mockProduct()];
      const result = rankProducts(products);
      expect(result).toEqual(products);
    });

    it('should preserve product order when no signals are available', () => {
      const products = [
        mockProduct({ id: 'prod-1', brand: 'Michelin' }),
        mockProduct({ id: 'prod-2', brand: 'Continental' }),
      ];
      const emptyProfile: InterestProfile = {
        version: 1,
        scope: 'guest',
        sessionId: 'test',
        userId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        brandWeights: {},
        categoryWeights: {},
        modelWeights: {},
        vehicleBrandWeights: {},
        vehicleModelWeights: {},
        termWeights: {},
        productWeights: {},
        eventCounts: {},
        recentSearches: [],
        recentlyViewedProductIds: [],
        cartProductIds: [],
        purchasedProductIds: [],
        wishlistedProductIds: [],
      };

      const result = rankProducts(products, {
        profile: emptyProfile,
        preserveWhenNoSignals: true,
      });

      expect(result).toEqual(products);
    });

    it('should sort by price ascending when priceDirection is asc', () => {
      const products = [
        mockProduct({ id: 'prod-1', price: 300 }),
        mockProduct({ id: 'prod-2', price: 100 }),
        mockProduct({ id: 'prod-3', price: 200 }),
      ];

      // preserveWhenNoSignals is intentionally omitted: when it's true and
      // there are no profile/searchTerm signals, rankProducts short-circuits
      // and returns the input order untouched, before the price tiebreak in
      // its sort comparator ever runs.
      const ranked = rankProducts(products, {
        priceDirection: 'asc',
      });

      expect(Number(ranked[0].price)).toBeLessThanOrEqual(Number(ranked[1].price));
      expect(Number(ranked[1].price)).toBeLessThanOrEqual(Number(ranked[2].price));
    });

    it('should sort by price descending when priceDirection is desc', () => {
      const products = [
        mockProduct({ id: 'prod-1', price: 100 }),
        mockProduct({ id: 'prod-2', price: 300 }),
        mockProduct({ id: 'prod-3', price: 200 }),
      ];

      const ranked = rankProducts(products, {
        priceDirection: 'desc',
      });

      expect(Number(ranked[0].price)).toBeGreaterThanOrEqual(Number(ranked[1].price));
      expect(Number(ranked[1].price)).toBeGreaterThanOrEqual(Number(ranked[2].price));
    });
  });

  describe('Session ID Management', () => {
    it('should generate and cache a session ID', () => {
      const id1 = getRecommendationSessionId();
      const id2 = getRecommendationSessionId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).toBe(id2);
    });

    it('should generate different session IDs on separate runs', () => {
      const id1 = getRecommendationSessionId();

      if (typeof window !== 'undefined') {
        (window.localStorage as any).clear?.();
      }

      const id2 = getRecommendationSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null profiles gracefully', () => {
      const product = mockProduct();
      const result = scoreProduct(product, { profile: null });

      expect(result.score).toBeDefined();
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should handle products with negative prices', () => {
      const product = mockProduct({ price: -100 });
      const profile = mockProfile();

      const result = scoreProduct(product, { profile });
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should handle extremely large stock numbers', () => {
      const product = mockProduct({ stock: 999999 });
      const profile = mockProfile();

      const result = scoreProduct(product, { profile });
      expect(result.breakdown.stock).toBeGreaterThan(0);
      expect(Number.isFinite(result.score)).toBe(true);
    });
  });
});
