import { Link } from "wouter";
import { Eye, Heart, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney, getPricing } from "@/lib/pricing";
import { calculateShipping } from "@shared/shipping";

/** The fields a card needs - satisfied by both Supabase and tRPC products. */
export type ProductCardProduct = {
  id: string;
  title: string | null;
  price: number | string | null;
  discount?: number | string | null;
  original_price?: number | string | null;
  cover_image_url?: string | null;
  stock?: number | null;
  brand?: string | null;
  condition?: string | null;
  category_name?: string | null;
};

type ProductCardProps<T extends ProductCardProduct> = {
  product: T;
  isWished?: boolean;
  onWishlistToggle?: (product: T) => void | Promise<void>;
  onQuickView?: (product: T) => void;
  onAddToCart?: (product: T) => void | Promise<unknown>;
  /** Fires when the shopper follows the card through to the product page. */
  onNavigate?: (product: T) => void;
  isAdding?: boolean;
  /** First row of a page: load the photo eagerly. */
  priority?: boolean;
  className?: string;
};

/** Stock at or below this is called out; it always reflects the real value. */
const LOW_STOCK_THRESHOLD = 3;

/**
 * The one product card used by every grid and rail in the storefront.
 *
 * Layout is a fixed stack (square photo, meta, two-line title, price, action)
 * so cards in a row always align whatever the title length, price size or
 * photo shape. The photo and title are links; wishlist, quick view and add to
 * cart are real buttons outside those links.
 */
export function ProductCard<T extends ProductCardProduct>({
  product,
  isWished = false,
  onWishlistToggle,
  onQuickView,
  onAddToCart,
  onNavigate,
  isAdding = false,
  priority = false,
  className,
}: ProductCardProps<T>) {
  const href = `/product/${product.id}`;
  const title = (product.title || "").replace(/\s+/g, " ").trim() || "Product";
  const { price, compareAt, percentOff, savings } = getPricing(product);
  const hasStockInfo = product.stock !== null && product.stock !== undefined;
  const stock = Number(product.stock ?? 0);
  const isOutOfStock = hasStockInfo && stock <= 0;
  const isLowStock = hasStockInfo && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  const shipsFree = price > 0 && calculateShipping(price) === 0;
  const meta = [product.brand, product.condition].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card transition-[box-shadow,border-color] duration-200 hover:border-gray-300 hover:shadow-card-hover focus-within:border-gray-300",
        className
      )}
    >
      <div className="relative">
        <Link
          href={href}
          onClick={() => onNavigate?.(product)}
          aria-label={title}
          tabIndex={-1}
          className="block"
        >
          <ProductImage
            src={product.cover_image_url}
            alt={title}
            priority={priority}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
            className="aspect-square w-full"
            imgClassName={cn(
              "p-2.5 transition-transform duration-300 ease-out group-hover:scale-[1.03]",
              isOutOfStock && "opacity-60 grayscale"
            )}
          />
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {percentOff ? (
            <span className="price rounded bg-brand px-1.5 py-0.5 text-xs font-bold leading-4 text-white">
              -{percentOff}%
            </span>
          ) : null}
          {isOutOfStock ? (
            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-xs font-semibold leading-4 text-white">
              Out of stock
            </span>
          ) : null}
        </div>

        {(onWishlistToggle || onQuickView) && (
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 transition-opacity duration-150 focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
            {onWishlistToggle && (
              <button
                type="button"
                onClick={() => void onWishlistToggle(product)}
                aria-label={
                  isWished ? "Remove from wishlist" : "Add to wishlist"
                }
                aria-pressed={isWished}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition-colors hover:border-gray-300 hover:text-ink"
              >
                <Heart
                  className={cn("h-4 w-4", isWished && "text-brand")}
                  fill={isWished ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            )}
            {onQuickView && (
              <button
                type="button"
                onClick={() => onQuickView(product)}
                aria-label="Quick view"
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition-colors hover:border-gray-300 hover:text-ink sm:flex"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <p className="eyebrow min-h-[1rem] truncate !text-xs">{meta}</p>

        <h3 className="mt-1 font-sans text-[13px] font-medium leading-snug tracking-normal text-ink sm:text-sm">
          <Link
            href={href}
            onClick={() => onNavigate?.(product)}
            className="line-clamp-2 min-h-[2.75em] hover:underline hover:underline-offset-2"
          >
            {title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="price text-base font-bold text-ink sm:text-lg">
            {formatMoney(price)}
          </span>
          {compareAt ? (
            <span className="price text-xs text-gray-500 line-through">
              {formatMoney(compareAt)}
            </span>
          ) : null}
        </div>

        <div className="mt-1 min-h-[1.125rem] text-xs leading-[1.125rem]">
          {savings ? (
            <span className="font-semibold text-brand">
              <span>You save</span>{" "}
              <span className="price">{formatMoney(savings)}</span>
            </span>
          ) : isLowStock ? (
            <span className="font-medium text-gray-600">
              {`Only ${stock} left`}
            </span>
          ) : shipsFree ? (
            <span className="font-medium text-success">Free shipping</span>
          ) : null}
        </div>

        {onAddToCart && (
          <div className="mt-auto pt-3">
            <button
              type="button"
              disabled={isOutOfStock || isAdding}
              onClick={() => void onAddToCart(product)}
              className={cn(
                "btn-secondary btn-sm btn-block min-w-0 px-2",
                !isOutOfStock &&
                  "group-hover:border-ink group-hover:bg-ink group-hover:text-white"
              )}
            >
              {isAdding ? (
                <Loader2
                  className="h-4 w-4 flex-none animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ShoppingCart
                  className="hidden h-4 w-4 flex-none sm:block"
                  aria-hidden="true"
                />
              )}
              {/* keyed so a stock change swaps the node instead of editing it */}
              <span key={isOutOfStock ? "out" : "add"} className="truncate">
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/** Loading placeholder with the exact footprint of a ProductCard. */
export function ProductCardSkeletonItem({
  withAction = true,
}: {
  withAction?: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
      aria-hidden="true"
    >
      <div className="aspect-square w-full animate-pulse bg-well" />
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-2.5 h-3.5 w-full animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-3.5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-5 w-20 animate-pulse rounded bg-muted" />
        {withAction && (
          <div className="mt-auto pt-6">
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

/** The grid every product listing shares, so rails and pages line up. */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export default ProductCard;
