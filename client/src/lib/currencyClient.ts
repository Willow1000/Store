// Add isAfricanUser helper
export function isAfricanUser(): boolean {
  const africanCountries = [
    'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','EH','ZM','ZW'
  ];
  const country = geoData?.location?.country_code2 || '';
  return africanCountries.includes(country);
}
import { fetchGeolocation, GeolocationData } from '../utils/geolocation';
import { fetchCurrencyRate } from '../utils/currency';
import { getCurrencySymbol } from '../utils/currencySymbols';

type CacheShape = {
  ip?: string;
  geo?: GeolocationData | null;
  currency?: { code: string; rate: number | null } | null;
  fetchedAt?: number | null;
};

const CACHE_KEY = 'geo-currency-cache';

let initialized = false;
let currencyCode = 'USD';
let currencyRate: number = 1;
let geoData: GeolocationData | null = null;


export async function initCurrencyClient(): Promise<void> {
  if (initialized) return;
  initialized = true;

  let cache: CacheShape = {};
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch (e) {
    cache = {};
  }

  // Try to use cached geo
  geoData = cache.geo || null;
  const fetchedAt = typeof cache.fetchedAt === 'number' ? cache.fetchedAt : null;
  const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
  const cacheExpired = !fetchedAt || (Date.now() - fetchedAt) > TTL_MS;

  // If cached currency exists, prefer it (unless African override applies)
  if (cache.currency && cache.currency.code) {
    try {
      const cc = cache.currency.code;
      const cr = typeof cache.currency.rate === 'number' ? cache.currency.rate : 1;
      currencyCode = cc;
      currencyRate = cr;
    } catch (e) {
      // ignore malformed cache
    }
  }

  // If no cached geo, or the cache is expired, fetch it
  if (!geoData || cacheExpired) {
    try {
      const g = await fetchGeolocation();
      if (g) {
        cache.geo = g;
        if (g.ip) cache.ip = g.ip;
        cache.fetchedAt = Date.now();
        geoData = g;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      // ignore
    }
  }

    // (Removed unreachable and broken code from previous patch)

  // If country is in Africa, always use USD for display and do NOT fetch currency API
  const africanCountries = [
    'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','EH','ZM','ZW'
  ];
  const country = geoData?.location?.country_code2 || '';
  if (africanCountries.includes(country)) {
    currencyCode = 'USD';
    currencyRate = 1;
    // Do not fetch currency API at all
    // Ensure we set a preferred locale for translations if possible
    try {
      ensureI18nextLocale();
    } catch (e) {
      // ignore
    }
    return;
  } else {
    // Prefer geoData.currency.code if present and not USD, else fallback by country
    let detectedCode = geoData?.currency?.code || currencyCode;
    if (!detectedCode || detectedCode === 'USD') {
      // Fallback: map by country code for Africa and others
      const fallbackMap: Record<string, string> = {
        NG: 'NGN', ZA: 'ZAR', KE: 'KES', GH: 'GHS', EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', AO: 'AOA', SD: 'SDG', UG: 'UGX', CM: 'XAF', CI: 'XOF', SN: 'XOF', ET: 'ETB', TZ: 'TZS', RW: 'RWF', MZ: 'MZN', BW: 'BWP', NA: 'NAD', MW: 'MWK', LS: 'LSL', SZ: 'SZL', MR: 'MRU',
        AU: 'AUD', CA: 'CAD', US: 'USD', GB: 'GBP', EU: 'EUR', JP: 'JPY', IN: 'INR', CN: 'CNY', RU: 'RUB',
        // Add more as needed
      };
      if (country && fallbackMap[country]) {
        detectedCode = fallbackMap[country];
      }
    }
    currencyCode = detectedCode || 'USD';

      if (currencyCode !== 'USD') {
      // Use cached currency if matches
      const cachedCurrency = cache.currency;
        if (cachedCurrency && cachedCurrency.code === currencyCode && typeof cachedCurrency.rate === 'number') {
          currencyRate = cachedCurrency.rate ?? 1;
        } else if (!cacheExpired && cachedCurrency && typeof cachedCurrency.rate === 'number') {
          // Use cached currency rate if cache is fresh even if code mismatch (safe fallback)
          currencyRate = cachedCurrency.rate ?? 1;
      } else {
        try {
          const rate = await fetchCurrencyRate(currencyCode);
          // If rate is invalid or API fails, fallback to 1 (actual/original price)
          if (!rate || isNaN(rate) || rate <= 0) {
            currencyRate = 1;
          } else {
            currencyRate = rate;
            cache.currency = { code: currencyCode, rate: currencyRate };
            cache.fetchedAt = Date.now();
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          }
        } catch (e) {
          // On any error, fallback to 1 (actual/original price)
          currencyRate = 1;
        }
      }
    } else {
      currencyRate = 1;
    }
  }

  // Ensure locale is set for i18next from geo data when available
  try {
    ensureI18nextLocale();
  } catch (e) {
    // ignore
  }
}

export function getCurrencyCode(): string {
  return currencyCode;
}

export function getCurrencyRate(): number {
  return currencyRate;
}

export function getCurrencySymbolLocal(): string {
  return getCurrencySymbol(currencyCode);
}

export function formatUSD(amountUSD: number): string {
  const rate = getCurrencyRate() || 1;
  const symbol = getCurrencySymbolLocal();
  return `${symbol}${(amountUSD * rate).toFixed(2)}`;
}

export function convertUSD(amountUSD: number): number {
  const rate = getCurrencyRate() || 1;
  return Math.round((amountUSD * rate) * 100) / 100;
}

export function getGeoData(): GeolocationData | null {
  // If geoData is missing, attempt to read from localStorage cache to populate it
  if (!geoData) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsedRaw = JSON.parse(raw);
        const parsed: CacheShape = (parsedRaw && typeof parsedRaw === 'object') ? parsedRaw : null;
        if (parsed) {
          // geo may be double-encoded or nested differently; try multiple fallbacks
          const possibleGeo = parsed.geo || parsed.g || parsed.location || null;
          if (possibleGeo) {
            // If possibleGeo is a string, try to parse
            if (typeof possibleGeo === 'string') {
              try {
                geoData = JSON.parse(possibleGeo) as GeolocationData;
              } catch (e) {
                // fallback: leave geoData null
              }
            } else {
              geoData = possibleGeo as GeolocationData;
            }
          }

          // Also ensure currencyCode/rate are populated from cache if present
          if (parsed.currency && parsed.currency.code) {
            currencyCode = parsed.currency.code;
            if (typeof parsed.currency.rate === 'number') currencyRate = parsed.currency.rate ?? 1;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return geoData;
}

export function getCountryCode(): string | null {
  const g = getGeoData();
  return (g && g.location && (g.location.country_code2 || g.location.country_code)) || null;
}

export function getPreferredLocale(): string | null {
  const g = getGeoData();
  if (!g) return null;
  // ipgeolocation returns languages in country_metadata.languages as array of short codes like ['de']
  const langs = (g.country_metadata && (g.country_metadata as any).languages) || (g.location && (g.location as any).languages) || null;
  let langCode: string | null = null;
  if (Array.isArray(langs) && langs.length) {
    langCode = String(langs[0]);
  }
  const country = getCountryCode();
  if (langCode && country) {
    // prefer lang-country form, e.g. de-DE
    return `${langCode}-${country}`;
  } else if (langCode) {
    return langCode;
  } else if (country) {
    // fallback mapping for some known countries
    const map: Record<string, string> = { DE: 'de-DE', GB: 'en-GB', US: 'en-US', AU: 'en-AU', FR: 'fr-FR', ES: 'es-ES' };
    return map[country] || `en-${country}`;
  }
  return null;
}

export function ensureI18nextLocale(): void {
  try {
    const existing = localStorage.getItem('i18nextLng');
    if (!existing) {
      const pref = getPreferredLocale();
      if (pref) localStorage.setItem('i18nextLng', pref);
    }
  } catch (e) {
    // ignore
  }
}

export default {
  init: initCurrencyClient,
  getCurrencyCode,
  getCurrencyRate,
  getCurrencySymbolLocal,
  formatUSD,
  convertUSD,
  getGeoData,
  isAfricanUser,
  getCountryCode,
  getPreferredLocale,
  ensureI18nextLocale,
};
