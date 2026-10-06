import { ProductCardSkeletonItem } from "@/components/ProductCard";

export function ProductCardSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div
      className={`grid gap-3 sm:gap-4 ${
        columns === 2
          ? "grid-cols-2"
          : columns === 4
            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
      }`}
    >
      {Array.from({ length: columns === 4 ? 12 : 8 }).map((_, i) => (
        <ProductCardSkeletonItem key={i} />
      ))}
    </div>
  );
}
