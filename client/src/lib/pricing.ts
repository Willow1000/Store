import currencyClient from "@/lib/currencyClient";

/**
 * Presentation helpers for prices. All amounts in the catalogue are USD;
 * conversion and symbol come from the shared currency client so every surface
 * shows the visitor's regional currency the same way.
 */

type PricedProduct = {
  price?: number | string | null;
  discount?: number | string | null;
  original_price?: number | string | null;
};

export type Pricing = {
  /** Selling price in USD. */
  price: number;
  /** Compare-at ("was") price in USD, only when it is really higher. */
  compareAt: number | null;
  /** Whole-number percentage saved, only when discounted. */
  percentOff: number | null;
  /** Amount saved in USD, only when discounted. */
  savings: number | null;
};

function toAmount(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * `products.discount` is the compare-at price in USD, NOT a percentage. A
 * product is only on sale when that figure is above the selling price.
 */
export function getPricing(product: PricedProduct): Pricing {
  const price = toAmount(product.price);
  const compareCandidate = toAmount(product.discount ?? product.original_price);
  const isDiscounted = price > 0 && compareCandidate > price;

  if (!isDiscounted) {
    return { price, compareAt: null, percentOff: null, savings: null };
  }

  const percentOff = Math.round(
    ((compareCandidate - price) / compareCandidate) * 100
  );

  return {
    price,
    compareAt: compareCandidate,
    percentOff: percentOff > 0 ? percentOff : null,
    savings: compareCandidate - price,
  };
}

function groupThousands(fixed: string): string {
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
}

/** USD amount -> visitor currency, e.g. "$1,750.00". */
export function formatMoney(amountUSD: number | string | null | undefined) {
  const converted =
    toAmount(amountUSD) * (currencyClient.getCurrencyRate() || 1);
  return `${currencyClient.getCurrencySymbolLocal()}${groupThousands(converted.toFixed(2))}`;
}

/**
 * USD threshold -> a round figure in the visitor currency for headings such as
 * "Under $50". Rounded UP so every product in the rail is truly under it.
 */
export function formatMoneyCeil(amountUSD: number) {
  const converted =
    toAmount(amountUSD) * (currencyClient.getCurrencyRate() || 1);
  return `${currencyClient.getCurrencySymbolLocal()}${groupThousands(String(Math.ceil(converted - 1e-9)))}`;
}

/**
 * Formats an amount that is ALREADY in the visitor currency. Checkout does
 * its own conversion/rounding; this only adds the symbol and grouping so its
 * totals read the same as the rest of the storefront.
 */
export function formatLocalMoney(localAmount: number) {
  return `${currencyClient.getCurrencySymbolLocal()}${groupThousands(toAmount(localAmount).toFixed(2))}`;
}
