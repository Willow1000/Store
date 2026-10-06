import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the product page: breadcrumb, gallery, buy box, details. */
export function ProductDetailSkeleton() {
  return (
    <main
      role="main"
      className="min-h-screen w-full overflow-x-hidden bg-white"
    >
      <div className="container py-5 sm:py-8">
        {/* Breadcrumb */}
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          {/* Gallery */}
          <div className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl sm:aspect-[4/3] lg:aspect-square" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-16 w-16 flex-none rounded-md sm:h-20 sm:w-20"
                />
              ))}
            </div>
          </div>

          {/* Buy box */}
          <div className="space-y-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="border-t border-gray-200 pt-5">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="mt-3 h-4 w-28" />
            </div>
            <Skeleton className="h-[52px] w-full rounded-md" />
            <Skeleton className="h-[52px] w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        {/* Details */}
        <div className="mt-12 grid gap-10 border-t border-gray-200 pt-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-4 ${i % 3 === 2 ? "w-3/5" : "w-full"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
