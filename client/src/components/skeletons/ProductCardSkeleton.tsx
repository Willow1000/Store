import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${
      columns === 2 ? 'grid-cols-2' :
      columns === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
      'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
    }`}>
      {Array.from({ length: columns === 4 ? 12 : 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="w-full h-40 md:h-48 rounded-lg" />
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      ))}
    </div>
  );
}
