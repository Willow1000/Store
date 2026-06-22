import { Link } from 'wouter';
import { ChevronRight, Eye, Heart } from 'lucide-react';
import { Product } from '@/types/supabase';
import { getHighResImageUrl } from '@/lib/images';
import currencyClient from '@/lib/currencyClient';

type ProductRecommendationSectionProps = {
  title: string;
  products: Product[];
  wishedProductIds?: Set<string>;
  onWishlistToggle?: (product: Product) => void | Promise<void>;
  onQuickView?: (productId: string) => void;
  onProductClick?: (product: Product) => void;
  ctaHref?: string;
  ctaLabel?: string;
  compact?: boolean;
};

function getDiscountPercentage(product: Product) {
  const price = Number(product.price || 0);
  const original = Number(product.discount || product.original_price || 0);
  if (!original || !price || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  if (currencyClient.isAfricanUser()) {
    return currencyClient.formatUSD(amount);
  }
  const rate = currencyClient.getCurrencyRate() || 1;
  const symbol = currencyClient.getCurrencySymbolLocal();
  return `${symbol}${(amount * rate).toFixed(2)}`;
}

export function ProductRecommendationSection({
  title,
  products,
  wishedProductIds = new Set(),
  onWishlistToggle,
  onQuickView,
  onProductClick,
  ctaHref = '/products',
  ctaLabel = 'View all',
  compact = false,
}: ProductRecommendationSectionProps) {
  if (!products.length) return null;

  const gridClasses = compact
    ? 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'
    : 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4';

  return (
    <section className="bg-white py-6">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-3 lg:px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950">{title}</h2>
          {ctaHref && (
            <Link href={ctaHref} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
              {ctaLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className={gridClasses}>
          {products.map((product) => {
            const discountPercentage = getDiscountPercentage(product);
            const isWished = wishedProductIds.has(product.id);
            const stock = Number(product.stock ?? 0);

            return (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                onClick={() => onProductClick?.(product)}
              >
                <div className="relative aspect-square bg-white">
                  {product.cover_image_url ? (
                    <img
                      src={getHighResImageUrl(product.cover_image_url)}
                      alt={product.title}
                      className="absolute inset-0 h-full w-full object-contain p-4"
                      loading="lazy"
                      decoding="async"
                      crossOrigin="anonymous"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                      No image
                    </div>
                  )}

                  {discountPercentage ? (
                    <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      -{discountPercentage}%
                    </span>
                  ) : null}

                  <span className={`absolute bottom-2 left-2 rounded px-2 py-1 text-xs font-bold ${stock === 0 ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-800'}`}>
                    {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                  </span>

                  <div className="absolute right-2 top-2 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {onWishlistToggle && (
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          await onWishlistToggle(product);
                        }}
                        className="rounded-full bg-white p-2 shadow hover:bg-gray-100"
                        aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`h-4 w-4 ${isWished ? 'text-red-500' : 'text-gray-600'}`} fill={isWished ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    {onQuickView && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onQuickView(product.id);
                        }}
                        className="rounded-full bg-white p-2 shadow hover:bg-gray-100"
                        aria-label="Quick view"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-950 group-hover:text-blue-700">
                    {product.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {[product.brand, product.model, product.category_name].filter(Boolean).slice(0, 2).join(' • ')}
                  </p>
                  <div className="mt-auto pt-3">
                    <span className="text-sm font-bold text-gray-950">{formatPrice(product.price)}</span>
                    {product.discount ? (
                      <span className="ml-2 text-xs text-gray-500 line-through">{formatPrice(product.discount)}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
