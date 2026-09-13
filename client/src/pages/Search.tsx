import { useLocation } from "wouter";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import currencyClient from "@/lib/currencyClient";
import { trpc } from "@/lib/trpc";
import { getHighResImageUrl } from "@/lib/images";
import { Skeleton } from "@/components/ui/skeleton";

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const query = searchParams.get("q") || "";

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
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
          <h1 className="mb-2 text-4xl font-bold">Search Results</h1>
          <p className="mb-8 text-gray-600">
            {query ? `Results for "${query}"` : "Enter a search term"}
          </p>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-48" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="group rounded-lg border border-border bg-white p-4 transition-all"
                  >
                    <Skeleton className="aspect-square rounded-lg bg-gray-100" />
                    <div className="mt-4 space-y-3">
                      <Skeleton className="h-5 w-11/12" />
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12">
              <p className="text-lg font-semibold">No products found</p>
              <p className="mt-2 text-sm text-gray-600">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-600">
                {total} {total === 1 ? "product" : "products"} found
                {total > results.length && ` (showing first ${results.length})`}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {results.map(product => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <a className="group rounded-lg border border-border bg-white p-4 transition-all hover:shadow-lg">
                      <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-secondary">
                        {product.cover_image_url ? (
                          <img
                            src={getHighResImageUrl(product.cover_image_url)}
                            alt={product.title ?? "MotorVault product"}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <h3 className="mb-2 line-clamp-2 font-semibold">
                        {product.title}
                      </h3>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-lg font-bold">
                          {currencyClient.formatUSD(Number(product.price || 0))}
                        </span>
                        {product.discount &&
                          Number(product.discount) > Number(product.price) && (
                            <span className="text-sm text-gray-500 line-through">
                              {currencyClient.formatUSD(
                                Number(product.discount)
                              )}
                            </span>
                          )}
                      </div>
                      <button className="w-full rounded-md bg-black py-2 text-sm font-semibold text-white hover:bg-gray-900">
                        View Product
                      </button>
                    </a>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
