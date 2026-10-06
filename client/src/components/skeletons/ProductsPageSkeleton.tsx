import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeletonItem } from "@/components/ProductCard";

/** Mirrors the listing page: header band, filter rail, toolbar and grid. */
export function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="container py-6 sm:py-8">
          <Skeleton className="mb-3 h-4 w-36" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2.5 h-5 w-64 max-w-full" />
        </div>
      </div>

      <div className="container py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
          {/* Sidebar Filters Skeleton */}
          <div className="hidden space-y-8 lg:block">
            {[7, 2, 2, 4, 5].map((rows, section) => (
              <div key={section}>
                <Skeleton className="mb-3 h-4 w-24" />
                <div className="space-y-2.5">
                  {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Products Grid Skeleton */}
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-11 flex-1 rounded-md" />
              <Skeleton className="h-11 w-full rounded-md sm:w-52" />
            </div>
            <div className="mt-4 flex gap-2 overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-24 flex-none rounded-full"
                />
              ))}
            </div>
            <Skeleton className="mb-4 mt-5 h-4 w-40" />

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeletonItem key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
