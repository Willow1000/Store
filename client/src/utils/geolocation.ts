// services/geolocation.ts

/**
 * Production-ready geolocation service
 *
 * Features:
 * - Strong typing
 * - Request timeout handling
 * - Retry support
 * - In-memory caching with TTL
 * - API key validation
 * - Safe error handling
 * - Response normalization
 * - Frontend-safe structure
 */

export interface TimeZoneData {
  name: string;
  offset: number;
  current_time: string;
  current_time_unix: number;
  is_dst: boolean;
}

export interface LocationData {
  continent_code: string;
  continent_name: string;

  country_code2: string;
  country_code3: string;

  country_name: string;
  country_name_official: string;

  country_capital: string;

  state_prov: string;
  state_code: string;

  district: string;
  city: string;
  zipcode: string;

  latitude: number;
  longitude: number;

  is_eu: boolean;

  country_flag: string;
  geoname_id: string;
  country_emoji: string;
}

export interface CountryMetadata {
  calling_code: string;
  tld: string;
  languages: string[];
}

export interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
}

export interface ASNData {
  as_number: string;
  organization: string;
  country: string;
}

export interface GeolocationData {
  ip: string;

  location: LocationData;

  country_metadata: CountryMetadata;

  currency: CurrencyData;

  asn: ASNData;

  time_zone: TimeZoneData;
}

interface CacheEntry {
  data: GeolocationData;
  expiresAt: number;
}

const GEOLOCATION_API =
  'https://api.ipgeolocation.io/v3/ipgeo';

const REQUEST_TIMEOUT_MS = 7000;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 mins
const MAX_RETRIES = 2;

const cache = new Map<string, CacheEntry>();

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Build cache key
 */
function buildCacheKey(ip?: string): string {
  return ip || 'self';
}

/**
 * Cleanup expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

/**
 * Get cached data
 */
function getCachedData(
  key: string
): GeolocationData | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Save data to cache
 */
function setCachedData(
  key: string,
  data: GeolocationData
): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Normalize API response
 */
function normalizeResponse(raw: any): GeolocationData {
  return {
    ip: raw.ip || '',

    location: {
      continent_code: raw.location?.continent_code || '',
      continent_name: raw.location?.continent_name || '',

      country_code2: raw.location?.country_code2 || '',
      country_code3: raw.location?.country_code3 || '',

      country_name: raw.location?.country_name || '',
      country_name_official:
        raw.location?.country_name_official || '',

      country_capital:
        raw.location?.country_capital || '',

      state_prov: raw.location?.state_prov || '',
      state_code: raw.location?.state_code || '',

      district: raw.location?.district || '',
      city: raw.location?.city || '',
      zipcode: raw.location?.zipcode || '',

      latitude: Number(
        raw.location?.latitude || 0
      ),

      longitude: Number(
        raw.location?.longitude || 0
      ),

      is_eu: Boolean(raw.location?.is_eu),

      country_flag:
        raw.location?.country_flag || '',

      geoname_id:
        raw.location?.geoname_id || '',

      country_emoji:
        raw.location?.country_emoji || '',
    },

    country_metadata: {
      calling_code:
        raw.country_metadata?.calling_code || '',

      tld:
        raw.country_metadata?.tld || '',

      languages:
        raw.country_metadata?.languages || [],
    },

    currency: {
      code: raw.currency?.code || '',
      name: raw.currency?.name || '',
      symbol: raw.currency?.symbol || '',
    },

    asn: {
      as_number:
        raw.asn?.as_number || '',

      organization:
        raw.asn?.organization || '',

      country:
        raw.asn?.country || '',
    },

    time_zone: {
      name: raw.time_zone?.name || '',

      offset: Number(
        raw.time_zone?.offset || 0
      ),

      current_time:
        raw.time_zone?.current_time || '',

      current_time_unix: Number(
        raw.time_zone?.current_time_unix || 0
      ),

      is_dst: Boolean(
        raw.time_zone?.is_dst
      ),
    },
  };
}

/**
 * Perform API request
 */
async function requestGeolocation(
  url: string
): Promise<GeolocationData | null> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',

      headers: {
        Accept: 'application/json',
      },

      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[geolocation] API error ${response.status}: ${response.statusText}`
      );

      return null;
    }

    const raw = await response.json();

    return normalizeResponse(raw);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      console.warn(
        '[geolocation] Request timeout'
      );
    } else {
      console.warn(
        '[geolocation] Request failed',
        error
      );
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Main geolocation fetcher
 */
export async function fetchGeolocation(
  ip?: string
): Promise<GeolocationData | null> {
  cleanupCache();

  const apiKey =
    import.meta.env.VITE_GEOLOCATION_API_KEY;

  if (!apiKey) {
    console.error(
      '[geolocation] Missing VITE_GEOLOCATION_API_KEY'
    );

    return null;
  }

  const cacheKey = buildCacheKey(ip);

  const cached = getCachedData(cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    apiKey,
  });

  if (ip) {
    params.append('ip', ip);
  }

  const url =
    `${GEOLOCATION_API}?${params.toString()}`;

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const data = await requestGeolocation(url);

    if (data) {
      setCachedData(cacheKey, data);

      return data;
    }

    attempt++;

    if (attempt <= MAX_RETRIES) {
      await sleep(1000 * attempt);
    }
  }

  return null;
}

/**
 * Clear all cache entries manually
 */
export function clearGeolocationCache(): void {
  cache.clear();
}

/**
 * Remove a specific IP from cache
 */
export function removeCachedGeolocation(
  ip?: string
): void {
  const cacheKey = buildCacheKey(ip);

  cache.delete(cacheKey);
}