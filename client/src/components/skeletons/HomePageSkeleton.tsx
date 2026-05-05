import { Skeleton } from '@/components/ui/skeleton';

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Slideshow Skeleton */}
      <div className="relative w-full h-screen max-h-[600px] overflow-hidden bg-gray-900">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-gray-800" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <Skeleton className="mx-auto h-12 w-4/5 bg-white/20" />
            <Skeleton className="mx-auto h-7 w-3/4 bg-white/20" />
            <Skeleton className="mx-auto h-5 w-full max-w-xl bg-white/20" />
            <Skeleton className="mx-auto h-12 w-40 rounded-lg bg-white/20" />
          </div>
        </div>
        <Skeleton className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15" />
        <Skeleton className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15" />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={`h-3 rounded-full ${i === 0 ? 'w-8' : 'w-3'} bg-white/20`} />
          ))}
        </div>
      </div>

      {/* Recently Viewed Section Skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <Skeleton className="relative w-full pt-[100%] rounded-none bg-gray-100" />
                <div className="p-3 sm:p-4 md:p-5 space-y-3">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Deals Section Skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4 py-6">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>

          <div className="grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <Skeleton className="relative w-full pt-[100%] rounded-none bg-gray-100" />
                <div className="p-3 sm:p-4 md:p-5 space-y-3">
                  <Skeleton className="h-4 w-11/12" />
                  <div className="flex items-baseline gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Skeleton className="mx-auto h-12 w-48 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Categories Section Skeleton */}
      <div className="bg-white py-6">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-3 md:px-4">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="relative h-40 overflow-hidden rounded-lg border bg-gray-100">
                <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-gray-200" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 space-y-2">
                  <Skeleton className="h-5 w-8 bg-white/20" />
                  <Skeleton className="h-4 w-11/12 bg-white/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
