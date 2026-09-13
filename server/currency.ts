import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

/**
 * Currency handling for Stripe charges.
 *
 * USD is the catalogue's base currency: every product price, shipping figure
 * and tax figure in the database is USD. The storefront converts those for
 * display based on the visitor's region, and the Stripe charge is created in
 * that same regional currency so the customer is charged exactly the currency
 * they were quoted in.
 *
 * The conversion happens HERE, on the server, and never from a rate supplied by
 * the browser. The checkout input already carries client-provided prices, so
 * accepting a client-provided FX rate on top of that would let a tampered
 * client pick its own exchange rate and underpay.
 *
 * Orders are still recorded in USD (the orders table has no currency column and
 * every total in it is USD), with the charged currency, charged amount and the
 * rate used carried in Stripe metadata for reconciliation.
 */

/** Currencies Stripe treats as having no minor unit - amounts are NOT x100. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

/**
 * Stripe accepts these in minor units but requires the amount to be evenly
 * divisible by 10, because the underlying networks only support 2 decimals.
 */
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

/**
 * Currencies this integration is willing to charge in. Anything outside the
 * list falls back to USD rather than risking a `create` call that Stripe
 * rejects at checkout time, which would strand the customer.
 */
const SUPPORTED_CHARGE_CURRENCIES = new Set([
  "AED",
  "AUD",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "USD",
  "ZAR",
]);

export function normalizeCurrencyCode(value: unknown): string {
  const code = String(value || "USD")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

/** The currency to actually charge in: the request's, or USD if unsupported. */
export function resolveChargeCurrency(value: unknown): string {
  const code = normalizeCurrencyCode(value);
  return SUPPORTED_CHARGE_CURRENCIES.has(code) ? code : "USD";
}

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrencyCode(currency));
}

/**
 * Convert a major-unit amount (12.34) into the integer Stripe expects.
 * Zero-decimal currencies are sent as whole units; three-decimal currencies are
 * rounded to the nearest 10 minor units as Stripe requires.
 */
export function toStripeMinorUnits(amount: number, currency: string): number {
  const code = normalizeCurrencyCode(currency);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return Math.round((amount * 1000) / 10) * 10;
  }
  return Math.round(amount * 100);
}

const rateCache = new Map<string, { rate: number; expires: number }>();
const RATE_CACHE_TTL = 1000 * 60 * 15;

async function fetchExchangeRate(target: string): Promise<number | null> {
  if (target === "USD") return 1;

  const apiKey =
    ENV.currencyApiKey ||
    process.env.VITE_CURRENCY_API_KEY ||
    process.env.CURRENCY_API_KEY ||
    "";

  if (apiKey) {
    try {
      const url = `https://api.freecurrencyapi.com/v1/latest?apikey=${encodeURIComponent(apiKey)}&currencies=${encodeURIComponent(target)}&base_currency=USD`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        const rate = json?.data?.[target];
        if (typeof rate === "number" && rate > 0) return rate;
      }
    } catch {
      // fall through to the secondary source
    }
  }

  try {
    const url = `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(target)}`;
    const response = await fetch(url);
    if (response.ok) {
      const json = await response.json();
      const rate = json?.rates?.[target];
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch {
    // fall through
  }

  return null;
}

/**
 * USD -> `currency` rate. Returns 1 when the rate cannot be fetched, so a
 * failing FX provider charges the USD amount rather than charging a wrong
 * number or failing the checkout outright.
 */
export async function getUsdRate(currency: string): Promise<number> {
  const code = normalizeCurrencyCode(currency);
  if (code === "USD") return 1;

  const cached = rateCache.get(code);
  if (cached && cached.expires > Date.now()) return cached.rate;

  const rate = await fetchExchangeRate(code);
  if (rate === null) {
    logger.warn(
      { data: [code] },
      "[Currency] No exchange rate available, charging in USD:"
    );
    return 1;
  }

  rateCache.set(code, { rate, expires: Date.now() + RATE_CACHE_TTL });
  return rate;
}

export type ChargeConversion = {
  /** Currency the Stripe charge is created in. */
  currency: string;
  /** USD -> currency rate actually applied (1 when charging USD). */
  rate: number;
  /** Convert a USD major-unit amount into this charge currency. */
  convert: (usdAmount: number) => number;
};

/**
 * Resolve the currency to charge in and the rate to use, once per checkout, so
 * every line item in a session is converted with the SAME rate. Fetching per
 * line item could straddle a cache expiry and produce a total that does not
 * equal the sum of its parts.
 */
export async function resolveChargeConversion(
  requestedCurrency: unknown
): Promise<ChargeConversion> {
  const currency = resolveChargeCurrency(requestedCurrency);
  const rate = currency === "USD" ? 1 : await getUsdRate(currency);
  const effectiveCurrency = rate === 1 && currency !== "USD" ? "USD" : currency;

  return {
    currency: effectiveCurrency,
    rate: effectiveCurrency === "USD" ? 1 : rate,
    convert: (usdAmount: number) =>
      effectiveCurrency === "USD"
        ? Number(usdAmount.toFixed(2))
        : Number((usdAmount * rate).toFixed(2)),
  };
}
