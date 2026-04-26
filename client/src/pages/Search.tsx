import { useLocation } from 'wouter';
import { useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const query = searchParams.get('q') || '';

  const { data: allProducts, isLoading } = trpc.products.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const results = useMemo(() => {
    if (!allProducts || !query) return [];
    const lowerQuery = query.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
    );
  }, [allProducts, query]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="mb-2 text-4xl font-bold">Search Results</h1>
        <p className="mb-8 text-gray-600">
          {query ? `Results for "${query}"` : 'Enter a search term'}
        </p>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12">
            <p className="text-lg font-semibold">No products found</p>
            <p className="mt-2 text-sm text-gray-600">Try a different search term</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-600">{results.length} products found</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <a className="group rounded-lg border border-border bg-white p-4 transition-all hover:shadow-lg">
                    <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-secondary">
                      {product.images && Array.isArray(product.images) && product.images[0] ? (
                        <img
                          src={product.images[0] as string}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 line-clamp-2 font-semibold">{product.name}</h3>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-lg font-bold">${product.price}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${product.originalPrice}
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
  );
}
