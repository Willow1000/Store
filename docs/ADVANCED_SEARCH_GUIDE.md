# Advanced Product Search & Filtering System

This document explains the comprehensive product search and filtering system that leverages all available product fields to ensure searches never yield empty results.

## Overview

The enhanced search system includes:
- **Multi-field searching** across title, brand, model, condition, category, part number, and item specifics
- **Relevance scoring** to rank results by relevance
- **Fallback to similar products** when exact matches aren't found
- **Advanced filtering** by brand, model, condition, stock status, and deals
- **Intelligent suggestions** for brands and models

## Search Architecture

### 1. Server-Side Search (Supabase)

First pass: Fetch products matching the search term across multiple fields:
```sql
SELECT * FROM products
WHERE title ILIKE '%search%'
   OR brand ILIKE '%search%'
   OR model ILIKE '%search%'
   OR category_name ILIKE '%search%'
   OR condition ILIKE '%search%'
   OR part_number ILIKE '%search%'
```

### 2. Client-Side Relevance Scoring

Each product is scored based on where the match occurs:

| Match Location | Score |
|---|---|
| Exact title match | 100 |
| Title starts with | 80 |
| Title contains | 60 |
| Each word in title | 15 |
| Exact brand match | 80 |
| Brand contains | 50 |
| Each word in brand | 10 |
| Model exact match | 70 |
| Model contains | 45 |
| Each word in model | 8 |
| Condition match | 25 |
| Category match | 20 |
| Part number exact | 50 |
| Part number contains | 30 |
| Item specifics | 15 |

### 3. Fallback to Similar Products

If no exact matches found, the system uses word-by-word matching to find similar products:
- Multi-word searches are broken down into individual words
- Products matching any word receive partial credit
- Word matches weighted by field importance
- Results sorted by total match score

## Implementation Details

### `productSearch.ts` - Core Utilities

#### `calculateRelevanceScore(product, searchTerm): number`
Calculates how relevant a product is to the search term. Returns a score where higher = more relevant.

**Example:**
```typescript
const score = calculateRelevanceScore(toyotaProduct, 'Toyota Camry');
// Returns 150+ (title + brand matches)
```

#### `searchProducts(products, searchTerm, options): Product[]`
Main search function that returns products sorted by relevance.

**Parameters:**
- `products`: Array of products to search
- `searchTerm`: Search query
- `options.includePartNumbers`: Include part number matches (default: true)
- `options.includeSimilar`: Show similar products if no exact matches (default: true)
- `options.maxResults`: Limit results (default: unlimited)

**Example:**
```typescript
const results = searchProducts(allProducts, 'Honda motorcycle', {
  includeSimilar: true,
  maxResults: 100
});
```

#### `filterProducts(products, filters): Product[]`
Filter products by multiple criteria simultaneously.

**Parameters:**
```typescript
filters: {
  priceRange?: [minPrice, maxPrice];     // e.g., [100, 5000]
  brands?: string[];                      // e.g., ['Toyota', 'Honda']
  models?: string[];                      // e.g., ['Civic', 'Accord']
  conditions?: string[];                  // e.g., ['new', 'like-new']
  categories?: string[];                  // e.g., ['motorcycles']
  inStock?: boolean;                      // Filter to in-stock only
  onSaleOnly?: boolean;                   // Filter to discounted items
}
```

**Example:**
```typescript
const filtered = filterProducts(allProducts, {
  priceRange: [1000, 50000],
  brands: ['Honda', 'Yamaha'],
  conditions: ['new', 'like-new'],
  inStock: true
});
```

#### `getSimilarProducts(products, targetProduct, limit): Product[]`
Get products similar to a given product (same category, brand, model, price range).

**Example:**
```typescript
const similar = getSimilarProducts(allProducts, selectedProduct, 6);
// Returns up to 6 similar products
```

#### `getBrandSuggestions(products, partial): string[]`
Get brand names matching a partial string - useful for autocomplete.

**Example:**
```typescript
const suggestions = getBrandSuggestions(allProducts, 'Toy');
// Returns ['Toyota', 'Toys R Us', ...]
```

#### `getModelSuggestions(products, partial): string[]`
Get model names matching a partial string - useful for autocomplete.

**Example:**
```typescript
const suggestions = getModelSuggestions(allProducts, 'Cam');
// Returns ['Camry', 'Camaro', ...]
```

## Hook Integration

### `useSearchProducts(searchTerm): { results, isLoading, error }`

Enhanced hook that uses the new search system:

1. **Server fetch** - Gets initial matches from Supabase
2. **Client score** - Scores all products by relevance
3. **Smart fallback** - If no exact matches, includes similar products
4. **Timeout handling** - 15-second timeout with error message

**Example:**
```typescript
const { results, isLoading, error } = useSearchProducts('Honda Civic');

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (results.length === 0) return <NoResults />;

return results.map(product => <ProductCard key={product.id} product={product} />);
```

## UI Filters in Products Page

### Available Filters

1. **Category** - Radio button selector
2. **Brand** - Multi-select checkboxes (populated from available products)
3. **Model** - Multi-select checkboxes (populated from available products)
4. **Condition** - Multi-select checkboxes (new, like-new, good, fair, used)
5. **Price Range** - Slider (0 - $10,000)
6. **In Stock Only** - Toggle
7. **Deals Only** - Toggle (products with discount > 0)
8. **Sort** - Select (newest, price-low, price-high, popular)

### Filter Behavior

- **AND logic** - All selected filters must match (intersection)
- **Multi-select within category** - OR logic (any of selected brands OR any of selected models)
- **Combine search + filters** - Applies filters to search results
- **Never empty** - Similar products shown if no exact matches

## Examples

### Search: "Toyota Camry Parts"
1. Server fetches products with 'Toyota', 'Camry', or 'Parts' in title/brand/model
2. Products scored by relevance:
   - Toyota Camry OEM doors (score: 150+) ← Top result
   - Toyota Camry suspension kit (score: 140+)
   - Honda Civic parts (score: 35) ← Similar product
3. Returns 100 highest-scored results

### Combined Search + Filter
- Search: "engine"
- Filter by: Brand = Toyota, Condition = Like-New
1. Server fetches engine-related products
2. Client filters to Toyota brand + like-new condition
3. Relevance scored and sorted
4. If 0 results: Similar engines from other brands shown (with less relevance)

### Filter-Only (No Search)
- Filters: Brand = Honda, Condition = New, Price = $1000-$5000
1. Loads all products
2. Filters to matching criteria
3. Sorts by selected sort option (newest, price, etc.)

## Performance Optimizations

1. **Debounced search** - 300ms delay before searching
2. **Timeout protection** - 15-second timeout on server queries
3. **Cached results** - Products cached in localStorage
4. **Limited results** - Max 100 search results, 12 per page
5. **Index optimization** - Database indexes on:
   - `idx_products_brand`
   - `idx_products_model`
   - `idx_products_part_number`
   - Existing category, owner, price indexes

## Edge Cases Handled

✓ **Empty search** - Returns all products
✓ **No exact matches** - Falls back to similar products
✓ **Misspelled terms** - Partial word matching catches variations
✓ **Very broad searches** - Limited to 100 results, paginated
✓ **No products in category** - Shows similar from other categories
✓ **Out of stock** - Included unless "In Stock Only" toggled
✓ **Network timeout** - 15-second timeout with user-friendly error
✓ **Old browser** - Graceful fallback to basic search

## Future Enhancements

- [ ] Elasticsearch integration for fulltext search
- [ ] AI-powered semantic search
- [ ] Search history and analytics
- [ ] Faceted search UI improvements
- [ ] Autocomplete with suggestions
- [ ] Fuzzy matching for typos
- [ ] Search boost for high-selling products
- [ ] Personalized search based on user history
