import { Skeleton } from '@/components/ui/skeleton';

export function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 py-6 md:py-8">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters Skeleton */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="bg-gray-50 p-6 rounded-lg space-y-6">
              {/* Category Filter */}
              <div>
                <Skeleton className="h-5 w-20 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>

              {/* Sort Filter */}
              <div>
                <Skeleton className="h-5 w-16 mb-3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Bar */}
            <Skeleton className="h-10 w-full rounded-lg mb-6" />

            {/* Products Count */}
            <Skeleton className="h-4 w-64 mb-4" />

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full h-40 md:h-48 rounded-lg" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex justify-center gap-2 mt-8">
              <Skeleton className="h-10 w-24" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-10" />
                ))}
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
