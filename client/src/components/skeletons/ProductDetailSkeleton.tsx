import { Skeleton } from '@/components/ui/skeleton';

export function ProductDetailSkeleton() {
  return (
    <main role="main" className="bg-white min-h-screen w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-8 flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Main Grid Layout */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-20 xl:gap-x-24 lg:items-start">
          {/* Left Side - Image Gallery */}
          <div className="flex flex-row sm:flex-col-reverse gap-3 sm:gap-0">
            <div className="w-16 sm:w-full sm:mt-6 flex flex-col sm:flex-row max-w-2xl sm:mx-auto lg:max-w-none">
              <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 w-full">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 sm:h-24 w-16 sm:w-full rounded-md bg-gray-100 flex-shrink-0" />
                ))}
              </div>
            </div>

            <div className="flex-1 sm:w-full">
              <Skeleton className="w-full rounded-lg shadow-lg border min-h-[300px] sm:min-h-[400px] bg-gray-100" />
            </div>
          </div>

          {/* Right Side - Product Info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-11/12" />
              <Skeleton className="h-6 w-40" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>

            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-5 rounded-full" />
              ))}
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="border-t pt-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md bg-gray-100" />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Skeleton className="flex-1 h-12 rounded-md" />
              <Skeleton className="h-12 w-12 rounded-md" />
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="mt-12 border-t border-gray-200 pt-12 space-y-8">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white px-4 py-3 border rounded-md shadow-sm space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-44" />
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Similar Items Section */}
        <section className="mt-24">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="group relative bg-white border rounded-lg overflow-hidden shadow-sm">
                <Skeleton className="w-full h-48 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
