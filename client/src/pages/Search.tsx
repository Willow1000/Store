import { useSearch } from "wouter";
import { Link } from "wouter";
import { Search as SearchIcon } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import {
  PRODUCT_GRID_CLASS,
  ProductCard,
  ProductCardSkeletonItem,
} from "@/components/ProductCard";

export default function Search() {
  // wouter's useLocation() returns the pathname only, so the query string has
  // to come from useSearch() - reading it off the path always produced "".
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const query = (searchParams.get("q") || "").trim();
  const { user } = useAuth();
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);

  // Search runs in Postgres over the whole catalogue. This used to pull the
  // first 100 products and filter them in the browser, so anything outside that
  // window was simply invisible to search.
  const { data, isLoading } = trpc.products.search.useQuery(
    { query, limit: 48, offset: 0 },
    { enabled: query.length > 0 }
  );

  const results = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <SEOHead
        pageType="search"
        title={
          query
            ? `Search results for ${query} | MotorVault`
            : "Search Results | MotorVault"
        }
        description="Search MotorVault's automotive parts catalog."
        canonical="/search"
        noIndex
      />
      <div className="min-h-screen w-full overflow-x-clip bg-background">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="container py-6 sm:py-8">
            <h1 className="text-ink">Search Results</h1>
            <p className="mt-1.5 text-sm text-gray-600 sm:text-base">
              {query ? `Results for "${query}"` : "Enter a search term"}
            </p>
          </div>
        </div>

        <div className="container py-6 sm:py-8">
          {isLoading ? (
            <div className={PRODUCT_GRID_CLASS}>
              {[...Array(10)].map((_, i) => (
                <ProductCardSkeletonItem key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <SearchIcon
                  className="h-5 w-5 text-gray-500"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-base font-semibold text-ink">
                {query ? "No products found" : "Enter a search term"}
              </p>
              {query && (
                <p className="mt-1.5 text-sm text-gray-600">
                  Try a different search term
                </p>
              )}
              <Link href="/products" className="btn-secondary btn-sm mt-5">
                All Products
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">
                {total} {total === 1 ? "product" : "products"} found
                {total > results.length && ` (showing first ${results.length})`}
              </p>
              <h2 className="sr-only">Products</h2>
              <div className={PRODUCT_GRID_CLASS}>
                {results.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={idx < 5}
                    onAddToCart={addProduct}
                    isAdding={pendingId === product.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
