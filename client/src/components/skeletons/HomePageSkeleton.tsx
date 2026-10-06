import { Skeleton } from "@/components/ui/skeleton";
import {
  PRODUCT_GRID_CLASS,
  ProductCardSkeletonItem,
} from "@/components/ProductCard";

/** Mirrors the home page bands: hero, trust strip, categories, product rail. */
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white">
      {/* Hero */}
      <div className="relative h-[440px] w-full overflow-hidden bg-gray-950 sm:h-[480px] lg:h-[540px]">
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="container pb-16 md:pb-0">
            <div className="max-w-xl space-y-4">
              <Skeleton className="h-3 w-48 bg-white/15" />
              <Skeleton className="h-10 w-4/5 bg-white/15 sm:h-12" />
              <Skeleton className="h-10 w-3/5 bg-white/15 sm:h-12" />
              <Skeleton className="h-5 w-full max-w-md bg-white/15" />
              <Skeleton className="h-[52px] w-56 rounded-md bg-white/15" />
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-b border-gray-200">
        <div className="container grid grid-cols-2 gap-4 py-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full max-w-[12rem]" />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="section">
        <div className="container">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Product rail */}
      <div className="section border-t border-gray-200">
        <div className="container">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className={PRODUCT_GRID_CLASS}>
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeletonItem key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
