import { Skeleton } from '@/components/ui/skeleton';

export function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 py-6 md:py-8">
        <div className="w-full max-w-full mx-auto px-2 sm:px-3 md:px-4 lg:px-2">
          <Skeleton className="h-10 w-48 mb-3" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </div>

      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Sidebar Filters Skeleton */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="bg-gray-50 p-6 rounded-lg sticky top-4 space-y-6">
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
          <div className="lg:col-span-4 space-y-4">
            {/* Search Bar */}
            <Skeleton className="h-10 w-full rounded-lg mb-6" />

            {/* Products Count */}
            <Skeleton className="h-4 w-64 mb-4" />

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="group rounded-lg border border-border bg-white p-4 space-y-3">
                  <Skeleton className="aspect-square rounded-lg bg-gray-100" />
                  <Skeleton className="h-4 w-11/12" />
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-md" />
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
