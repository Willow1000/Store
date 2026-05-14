import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${
      columns === 2 ? 'grid-cols-2' :
      columns === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
      'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
    }`}>
      {Array.from({ length: columns === 4 ? 12 : 8 }).map((_, i) => (
        <div key={i} className="group relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <Skeleton className="w-full pt-[100%] rounded-none bg-gray-100" />
          <div className="p-3 sm:p-4 md:p-5 space-y-3">
            <Skeleton className="h-4 w-11/12" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
