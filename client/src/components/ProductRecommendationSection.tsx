import type { ReactNode } from "react";
import { Product } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { PRODUCT_GRID_CLASS, ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";

type ProductRecommendationSectionProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  products: Product[];
  wishedProductIds?: Set<string>;
  onWishlistToggle?: (product: Product) => void | Promise<void>;
  onQuickView?: (productId: string) => void;
  onProductClick?: (product: Product) => void;
  /** Shows an "Add to Cart" button on each card when provided. */
  onAddToCart?: (product: Product) => void | Promise<unknown>;
  /** Id of the product currently being added (shows a spinner). */
  addingProductId?: string | null;
  ctaHref?: string;
  ctaLabel?: string;
  /** Kept for existing call sites; spacing is now uniform. */
  compact?: boolean;
  /** Alternate band colour so stacked rails read as separate sections. */
  tone?: "white" | "tint";
  className?: string;
};

export function ProductRecommendationSection({
  title,
  eyebrow,
  description,
  products,
  wishedProductIds = new Set(),
  onWishlistToggle,
  onQuickView,
  onProductClick,
  onAddToCart,
  addingProductId = null,
  ctaHref = "/products",
  ctaLabel = "View all",
  tone = "white",
  className,
}: ProductRecommendationSectionProps) {
  if (!products.length) return null;

  return (
    <section
      className={cn(
        "section",
        tone === "tint" ? "bg-gray-50" : "bg-white",
        className
      )}
    >
      <div className="container">
        <SectionHeader
          title={title}
          eyebrow={eyebrow}
          description={description}
          ctaHref={ctaHref}
          ctaLabel={ctaLabel}
        />

        {/* Rows stay complete at every breakpoint: 2/3/4/5 columns */}
        <div
          className={cn(
            PRODUCT_GRID_CLASS,
            "md:max-lg:[&>*:nth-child(n+10)]:hidden lg:max-xl:[&>*:nth-child(n+9)]:hidden xl:[&>*:nth-child(n+11)]:hidden"
          )}
        >
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isWished={wishedProductIds.has(product.id)}
              onWishlistToggle={onWishlistToggle}
              onQuickView={
                onQuickView ? item => onQuickView(item.id) : undefined
              }
              onAddToCart={onAddToCart}
              isAdding={addingProductId === product.id}
              onNavigate={onProductClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
