import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  ChevronRight, Lock, Truck, AlertCircle, Check,
  CreditCard, Apple, Globe, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/_core/hooks/useAuth';
import { generateUUID } from '@/lib/paystack';
import { readCartFromStorage } from '@/lib/cart';
import { trpc, trpcClient } from '@/lib/trpc';
import { useSupabaseCart } from '@/hooks/useSupabaseCart';
import { supabase } from '@/lib/supabase';
import { getHighResImageUrl } from '@/lib/images';
import { COUNTRY_PHONE_OPTIONS, DEFAULT_PHONE_COUNTRY, buildInternationalPhoneNumber, formatLocalPhoneNumber, getCountryPhoneLabel, normalizeLocalPhoneDigits } from '@/lib/countryPhone';
import { calculateShipping, getFreeShippingThresholdUsd } from '@shared/shipping';
import { calculateVariableVat } from '@/lib/vat';
import currencyClient from '@/lib/currencyClient';
import { City, Country, State } from 'country-state-city';
import { isMetaCheckoutRequest, parseMetaCouponPercent, parseMetaCheckoutParams, parseMetaProductsParam } from '@/lib/metaCheckout';
import { sanitizeEmail, sanitizePhone, sanitizePhoneInput, sanitizePostalCode, sanitizeText, sanitizeTextInput, sanitizeName, sanitizeNameInput } from '@shared/sanitize';
import { InlineCheckoutAuth } from '@/components/InlineCheckoutAuth';
import { trackInitiateCheckout, trackPurchase } from '@/hooks/useMetaPixel';
import { TrustSignals } from '@/components/TrustSignals';
import { getSiteLanguage, translateText } from '@/lib/language';

const CHECKOUT_CART_SNAPSHOT_KEY = 'checkout-cart-snapshot-v1';
const META_PURCHASE_TRACKED_PREFIX = 'meta-purchase-tracked-v1:';

type CartItem = {
  product_id: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
};

type CheckoutFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountry: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type PaymentMethod = {
  id: 'visa' | 'mastercard' | 'applePay';
  name: string;
  icon: ReactNode;
  description: string;
  disabled?: boolean;
};

function readCheckoutSnapshot(): CartItem[] {
  try {
    const raw = localStorage.getItem(CHECKOUT_CART_SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCheckoutSnapshot(items: CartItem[]) {
  try {
    localStorage.setItem(CHECKOUT_CART_SNAPSHOT_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage issues and continue with in-memory checkout state.
  }
}

function hasTrackedMetaPurchase(reference: string): boolean {
  try {
    return Boolean(localStorage.getItem(`${META_PURCHASE_TRACKED_PREFIX}${reference}`));
  } catch {
    return false;
  }
}

function markTrackedMetaPurchase(reference: string) {
  try {
    localStorage.setItem(`${META_PURCHASE_TRACKED_PREFIX}${reference}`, new Date().toISOString());
  } catch {
    // Ignore persistence issues; duplicate prevention is best effort.
  }
}

const t = (_key: string, fallback: string) => fallback;

type StateOption = {
  value: string;
  label: string;
};

const COUNTRY_REGION_VALUE = '__COUNTRY__';
const PRELOAD_LOCATION_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'GB', 'NL', 'PL', 'BE', 'AT', 'SE'];

type CountryState = {
  isoCode: string;
  name: string;
};

const countryStatesCache = new Map<string, CountryState[]>();
const stateOptionsCache = new Map<string, StateOption[]>();
const countryCitiesCache = new Map<string, string[]>();
const countryCityStateCodesCache = new Map<string, Set<string>>();
const stateCitiesCache = new Map<string, string[]>();
const stateCityAvailabilityCache = new Map<string, boolean>();

const COUNTRY_OPTIONS = Country.getAllCountries()
  .map((country) => ({
    value: country.isoCode,
    label: country.name,
    flag: country.flag || '',
  }))
  .filter((country) => country.value && country.label)
  .sort((a, b) => a.label.localeCompare(b.label));

const POSTAL_LABEL_BY_COUNTRY: Record<string, string> = {
  US: 'ZIP Code',
  GB: 'Postcode',
  IE: 'Eircode',
};

function getStateLabel(country: string | undefined | null): string {
  if (!country) return 'State/Province/Region';
  const c = String(country).toUpperCase();
  if (c === 'US') return 'State';
  if (c === 'CA') return 'Province';
  if (c === 'GB') return 'Region';
  if (c === 'IE') return 'County';
  return 'State/Province/Region';
}

function getPostalCodeLabel(country: string | undefined | null): string {
  if (!country) return 'Postal code';
  const c = String(country).toUpperCase();
  return POSTAL_LABEL_BY_COUNTRY[c] || 'Postal code';
}

function getCountryStates(country: string): CountryState[] {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return [];

  const cached = countryStatesCache.get(countryCode);
  if (cached) return cached;

  const states = State.getStatesOfCountry(countryCode)
    .map((state) => ({
      isoCode: state.isoCode,
      name: state.name,
    }))
    .filter((state) => state.isoCode && state.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  countryStatesCache.set(countryCode, states);
  return states;
}

function normalizeRegionCode(country: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const states = getCountryStates(country);
  if (states.some((state) => state.isoCode === trimmed)) return trimmed;

  const normalized = trimmed.toLocaleLowerCase();
  const match = states.find((state) => state.name.toLocaleLowerCase() === normalized);
  return match?.isoCode || trimmed;
}

const getStateOptions = (country: string): StateOption[] => {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return [{ value: '', label: 'Select state' }];

  const cached = stateOptionsCache.get(countryCode);
  if (cached) return cached;

  const states = getCountryStates(countryCode);
  if (states.length > 0) {
    const cityStateCodes = countryCode === 'US' ? new Set<string>() : getCountryCityStateCodes(countryCode);
    const statesWithCityData = cityStateCodes.size > 0
      ? states.filter((state) => cityStateCodes.has(state.isoCode))
      : [];
    const selectableStates = statesWithCityData.length > 0 ? statesWithCityData : states;
    const options = [
      { value: '', label: 'Select state' },
      ...selectableStates.map((state) => ({ value: state.isoCode, label: state.name })),
    ];
    stateOptionsCache.set(countryCode, options);
    return options;
  }

  const countryName = Country.getCountryByCode(countryCode)?.name;
  const countryCities = getCountryCityOptions(countryCode);
  if (countryName && countryCities.length > 0) {
    const options = [
      { value: '', label: 'Select state' },
      { value: COUNTRY_REGION_VALUE, label: countryName },
    ];
    stateOptionsCache.set(countryCode, options);
    return options;
  }

  const options = [{ value: '', label: 'Select state' }];
  stateOptionsCache.set(countryCode, options);
  return options;
};

const usesManualLocationFields = (country: string): boolean => {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return false;

  const states = getCountryStates(countryCode);
  if (states.length === 0) {
    return getCountryCityOptions(countryCode).length === 0;
  }

  return !hasAnyStateCityData(countryCode) && getCountryCityOptions(countryCode).length === 0;
};

function uniqueSortedCityNames(cities: Array<{ name?: string }>): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const city of cities) {
    const name = city.name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names.sort((a, b) => a.localeCompare(b));
}

function getCountryCityOptions(country: string): string[] {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return [];

  const cached = countryCitiesCache.get(countryCode);
  if (cached) return cached;

  const cities = uniqueSortedCityNames(City.getCitiesOfCountry(countryCode) || []);
  countryCitiesCache.set(countryCode, cities);
  return cities;
}

function getCountryCityStateCodes(country: string): Set<string> {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return new Set();

  const cached = countryCityStateCodesCache.get(countryCode);
  if (cached) return cached;

  const stateCodes = new Set<string>();
  for (const city of City.getCitiesOfCountry(countryCode) || []) {
    const stateCode = (city as { stateCode?: string }).stateCode?.trim();
    if (stateCode) stateCodes.add(stateCode);
  }

  countryCityStateCodesCache.set(countryCode, stateCodes);
  return stateCodes;
}

function getStateCityOptions(country: string, state: string): string[] {
  const countryCode = String(country || '').toUpperCase();
  const stateCode = String(state || '').trim();
  if (!countryCode || !stateCode || stateCode === COUNTRY_REGION_VALUE) return [];

  const cacheKey = `${countryCode}:${stateCode}`;
  const cached = stateCitiesCache.get(cacheKey);
  if (cached) return cached;

  const cities = uniqueSortedCityNames(City.getCitiesOfState(countryCode, stateCode) || []);
  stateCitiesCache.set(cacheKey, cities);
  return cities;
}

function hasAnyStateCityData(country: string): boolean {
  const countryCode = String(country || '').toUpperCase();
  if (!countryCode) return false;

  const cached = stateCityAvailabilityCache.get(countryCode);
  if (cached !== undefined) return cached;

  const states = getCountryStates(countryCode);
  const firstState = states[0];
  const hasCityData = Boolean(firstState && getStateCityOptions(countryCode, firstState.isoCode).length > 0) ||
    states.some((state) => getCountryCityStateCodes(countryCode).has(state.isoCode));
  stateCityAvailabilityCache.set(countryCode, hasCityData);
  return hasCityData;
}

const getCityOptions = (country: string, state: string): string[] => {
  if (!state) {
    return [];
  }
  const countryCode = String(country || '').toUpperCase();
  if (state === COUNTRY_REGION_VALUE) return getCountryCityOptions(countryCode);
  const stateCities = getStateCityOptions(countryCode, state);
  if (stateCities.length > 0) return stateCities;
  return getCountryCityOptions(countryCode);
};

const usesManualCityField = (country: string, state: string): boolean => {
  if (usesManualLocationFields(country)) return true;
  if (!state) return false;
  if (state === COUNTRY_REGION_VALUE) return false;
  return getCityOptions(country, state).length === 0;
};

PRELOAD_LOCATION_COUNTRIES.forEach((countryCode) => {
  getCountryStates(countryCode);
});

export default function Checkout() {
  const activeLanguage = getSiteLanguage();
  const checkoutText = (key: string, fallback: string) => translateText(activeLanguage, key, fallback);
  // Get geo data from currencyClient
  const geo = currencyClient.getGeoData();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading, sessionRestored } = useAuth();
  const {
    items: supabaseCartItems,
    isLoading: supabaseCartLoading,
    clearCart: clearSupabaseCart,
  } = useSupabaseCart(user?.id || null);
  const [metaCoupon, setMetaCoupon] = useState<string | null>(null);
  const [metaParams, setMetaParams] = useState<Record<string, string>>({});

  const isMetaCheckout = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return isMetaCheckoutRequest(params, window.location.pathname);
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>(() => {
    try {
      const saved = localStorage.getItem('checkout-step');
      return (saved as 'shipping' | 'payment' | 'review') || 'shipping';
    } catch {
      return 'shipping';
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'visa' | 'mastercard' | 'applePay'>('visa');
  // Coupon code UI state
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedOfferData, setAppliedOfferData] = useState<any | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const paymentCallbackHandledRef = useRef(false);
  const geoPrefillAppliedRef = useRef(false);

  const [formData, setFormData] = useState<CheckoutFormData>(() => {
    try {
      const saved = localStorage.getItem('checkout-form-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          firstName: parsed.firstName || user?.name?.split(' ')[0] || '',
          lastName: parsed.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
          email: parsed.email || user?.email || '',
          phone: parsed.phone || '',
          phoneCountry: parsed.phoneCountry || parsed.country || DEFAULT_PHONE_COUNTRY,
          address: parsed.address || '',
          city: parsed.city || '',
          state: parsed.state || '',
          zip: parsed.zip || '',
          country: parsed.country || 'US',
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      phone: '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    };
  });

  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const manualLocationFields = useMemo(
    () => usesManualLocationFields(formData.country),
    [formData.country]
  );
  const stateOptions = useMemo(
    () => getStateOptions(formData.country),
    [formData.country]
  );
  const structuredStateOptions = useMemo(
    () => stateOptions.filter((state) => state.value),
    [stateOptions]
  );
  const cityOptions = useMemo(
    () => (manualLocationFields ? [] : getCityOptions(formData.country, formData.state)),
    [manualLocationFields, formData.country, formData.state]
  );
  const manualCityField = useMemo(
    () => usesManualCityField(formData.country, formData.state),
    [formData.country, formData.state]
  );

  // Auto-fill country from geolocation once, but only use state/city when
  // they belong to the same country and match the selected field mode.
  useEffect(() => {
    if (!geo || geoPrefillAppliedRef.current) return;
    geoPrefillAppliedRef.current = true;

    const geoCountry = geo.location?.country_code2?.toUpperCase() || '';
    if (!geoCountry || !COUNTRY_OPTIONS.some((country) => country.value === geoCountry)) return;

    setFormData((prev) => {
      const selectedCountry = prev.country || geoCountry;
      const shouldUseGeoCountry =
        (!prev.address && !prev.state && !prev.city && (!prev.country || prev.country === DEFAULT_PHONE_COUNTRY)) ||
        prev.country === geoCountry;
      const nextCountry = shouldUseGeoCountry ? geoCountry : selectedCountry;
      const next: CheckoutFormData = {
        ...prev,
        country: nextCountry,
        phoneCountry:
          nextCountry === geoCountry &&
          (!prev.phoneCountry || prev.phoneCountry === prev.country || prev.phoneCountry === DEFAULT_PHONE_COUNTRY)
            ? geoCountry
            : prev.phoneCountry,
      };

      if (nextCountry !== geoCountry || prev.state || prev.city) return next;

      const geoState = sanitizeTextInput(geo.location?.state_prov || '', 80);
      const geoCity = sanitizeTextInput(geo.location?.city || '', 80);

      if (usesManualLocationFields(geoCountry)) {
        next.state = geoState;
        next.city = geoCity;
        return next;
      }

      const normalizedState = normalizeRegionCode(geoCountry, geoState);
      const stateExists = getStateOptions(geoCountry).some((state) => state.value === normalizedState);
      if (!stateExists) return next;

      next.state = normalizedState;
      const validCities = getCityOptions(geoCountry, normalizedState);
      if (validCities.includes(geoCity)) {
        next.city = geoCity;
      }

      return next;
    });
  }, [geo]);

  // Meta/Facebook checkout entry: parse products/coupon/cart_origin and build cart from product IDs.
  useEffect(() => {
    if (!isMetaCheckout || typeof window === 'undefined') return;

    const metaCheckoutParams = parseMetaCheckoutParams(window.location.search);
    const parsedProducts = parseMetaProductsParam(metaCheckoutParams.products);

    setMetaCoupon(metaCheckoutParams.coupon);
    setMetaParams(metaCheckoutParams.raw);

    const clearCartRequested = new URLSearchParams(window.location.search).get('clear') === 'true';
    if (clearCartRequested) {
      localStorage.removeItem('cart');
      localStorage.removeItem(CHECKOUT_CART_SNAPSHOT_KEY);
    }

    if (parsedProducts.length === 0) {
      setCartItems([]);
      toast.error('No valid products were provided for checkout.');
      return;
    }

    const hydrateMetaCart = async () => {
      const ids = parsedProducts.map((item) => item.productId);
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, cover_image_url, stock')
        .in('id', ids);

      if (error) {
        console.error('[Checkout] Failed to load Meta checkout products:', error);
        toast.error('Unable to load checkout products from your Meta cart.');
        return;
      }

      const productMap = new Map((data || []).map((product) => [String(product.id), product]));
      const unavailable: string[] = [];

      const mapped: CartItem[] = parsedProducts
        .map((entry) => {
          const product = productMap.get(entry.productId);
          if (!product) {
            unavailable.push(entry.productId);
            return null;
          }

          const availableStock = Number(product.stock ?? 0);
          if (availableStock <= 0) {
            unavailable.push(entry.productId);
            return null;
          }

          return {
            product_id: String(product.id),
            title: product.title || 'Product',
            price: `$ ${Number(product.price || 0).toFixed(2)}`,
            image: product.cover_image_url || '',
            quantity: Math.min(entry.quantity, availableStock),
          };
        })
        .filter((value): value is CartItem => Boolean(value));

      setCartItems(mapped);
      writeCheckoutSnapshot(mapped);

      const localCart = mapped.map((item) => ({
        productId: item.product_id,
        productIndex: Number.NaN,
        title: item.title,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
      }));
      localStorage.setItem('cart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('cartUpdated'));

      if (unavailable.length > 0) {
        toast.warning('Some items were unavailable and were removed from checkout.');
      }
    };

    hydrateMetaCart();
  }, [isMetaCheckout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (paymentCallbackHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');
    const reference = params.get('reference');
    const rawStatus = params.get('status');

    if (paymentState === 'failed') {
      paymentCallbackHandledRef.current = true;
      toast.error(reference ? `Payment failed for reference ${reference}` : 'Payment failed');
      setStep('review');
      return;
    }

    if (paymentState === 'pending') {
      paymentCallbackHandledRef.current = true;
      const statusLabel = rawStatus ? ` (${rawStatus})` : '';
      toast.error(`Payment is not completed yet${statusLabel}. Please complete payment and try again.`);
      setStep('review');
      return;
    }

    if (paymentState === 'needs_auth') {
      paymentCallbackHandledRef.current = true;
      toast.error('Please sign in to complete your order for this verified payment.');
      setStep('shipping');
      return;
    }

    if (paymentState === 'success') {
      paymentCallbackHandledRef.current = true;
      (async () => {
        try {
          const verification = reference
            ? await trpcClient.paystack.transactions.verify.query({ reference })
            : null;
          const verifiedData = (verification as any)?.data || {};
          const amountValue = Number(verifiedData.amount);
          const purchaseAmount = Number.isFinite(amountValue) ? Number((amountValue / 100).toFixed(2)) : null;
          const purchaseCurrency = typeof verifiedData.currency === 'string' ? verifiedData.currency : null;

          trackConfirmedPurchase(reference, reference, purchaseAmount, purchaseCurrency);

          if (isAuthenticated) {
            try {
              await clearSupabaseCart();
            } catch (err) {
              console.warn('[Checkout] Failed to clear Supabase cart after success callback:', err);
            }
          }
          localStorage.removeItem('cart');
          localStorage.removeItem(CHECKOUT_CART_SNAPSHOT_KEY);
          window.dispatchEvent(new Event('cartUpdated'));
          toast.success('Payment completed successfully');
          navigate('/orders');
        } catch (err) {
          console.error('[Checkout] Failed to confirm successful payment:', err);
          if (isAuthenticated) {
            try {
              await clearSupabaseCart();
            } catch (clearErr) {
              console.warn('[Checkout] Failed to clear Supabase cart after success callback:', clearErr);
            }
          }
          localStorage.removeItem('cart');
          localStorage.removeItem(CHECKOUT_CART_SNAPSHOT_KEY);
          window.dispatchEvent(new Event('cartUpdated'));
          toast.success('Payment completed successfully');
          navigate('/orders');
        }
      })();
      return;
    }

    // Fallback: if Paystack returns only `reference` without our `payment` state,
    // verify the transaction and map to the same UX states.
    if (!paymentState && reference) {
      paymentCallbackHandledRef.current = true;
      (async () => {
        try {
          const verification = await trpcClient.paystack.transactions.verify.query({ reference });
          const status = String((verification as any)?.data?.status || '').toLowerCase();

          if (status === 'success') {
            const verifiedData = (verification as any)?.data || {};
            const amountValue = Number(verifiedData.amount);
            const purchaseAmount = Number.isFinite(amountValue) ? Number((amountValue / 100).toFixed(2)) : null;
            const purchaseCurrency = typeof verifiedData.currency === 'string' ? verifiedData.currency : null;

            trackConfirmedPurchase(reference, reference, purchaseAmount, purchaseCurrency);

            if (isAuthenticated) {
              try {
                await clearSupabaseCart();
              } catch (err) {
                console.warn('[Checkout] Failed to clear Supabase cart after verified reference:', err);
              }
            }
            localStorage.removeItem('cart');
            localStorage.removeItem(CHECKOUT_CART_SNAPSHOT_KEY);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success('Payment completed successfully');
            navigate('/orders');
            return;
          }

          if (['ongoing', 'pending', 'processing', 'queued'].includes(status)) {
            toast.error(`Payment is not completed yet (${status}). Please complete payment and try again.`);
            setStep('review');
            return;
          }

          toast.error(reference ? `Payment failed for reference ${reference}` : 'Payment failed');
          setStep('review');
        } catch (verifyErr) {
          console.error('[Checkout] Failed to verify payment reference from URL:', verifyErr);
          toast.error('Unable to verify payment reference. Please try again.');
          setStep('review');
        }
      })();
    }
  }, [navigate, clearSupabaseCart, isAuthenticated]);

  // Persist formData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('checkout-form-data', JSON.stringify(formData));
    } catch {
      console.warn('[Checkout] Failed to persist form data');
    }
  }, [formData]);

  // Persist checkout step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('checkout-step', step);
    } catch {
      console.warn('[Checkout] Failed to persist checkout step');
    }
  }, [step]);

  const composeAddressLine = (address: string, state: string) => `${address} | ${state}`;
  const parseAddressLine = (line: string | null) => {
    const raw = line || '';
    const [addressPart, statePart] = raw.split(' | ');
    return {
      address: (addressPart || '').trim(),
      state: (statePart || '').trim(),
    };
  };

  // Load cart from the appropriate source
  useEffect(() => {
    if (isMetaCheckout) return;

    if (isAuthenticated) {
      const mapped = supabaseCartItems.map((item) => ({
        product_id: item.product_id,
        title: item.product?.title || 'Product',
        price: `$ ${Number(item.product?.price || 0).toFixed(2)}`,
        image: item.product?.cover_image_url || '',
        quantity: item.quantity,
      }));

      if (mapped.length > 0) {
        setCartItems(mapped);
        writeCheckoutSnapshot(mapped);
        return;
      }

      // If checkout returns from a failed/abandoned payment before cart hydration,
      // keep showing the last known cart snapshot instead of dropping total to 0.00.
      const snapshot = readCheckoutSnapshot();
      setCartItems(snapshot);
      return;
    }

    const savedCart = localStorage.getItem('cart');
    const items = readCartFromStorage(savedCart).map((item) => ({
      product_id: item.productId || String(item.productIndex),
      title: item.title,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    }));
    setCartItems(items);
    writeCheckoutSnapshot(items);
  }, [isAuthenticated, supabaseCartItems, isMetaCheckout]);

  // Keep shipping form synced when user becomes available after refresh.
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      firstName: prev.firstName || sanitizeName(user.name?.split(' ')[0] || '', 60),
      lastName: prev.lastName || sanitizeName(user.name?.split(' ').slice(1).join(' ') || '', 60),
      email: prev.email || sanitizeEmail(user.email || '', 255),
    }));
  }, [user?.id]); // Only depend on user.id to avoid frequent updates

  // Prefill shipping fields from saved default address.
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!isAuthenticated || !user?.id) return;

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Checkout] Failed to load default address:', error);
        return;
      }

      if (!data) return;

      const parsed = parseAddressLine(data.address_line);
      setFormData((prev) => {
        const savedCountry = String(data.country || prev.country || 'US').toUpperCase();
        const shouldUseSavedCountry = !prev.address && !prev.state && !prev.city;

        return {
          ...prev,
          address: prev.address || parsed.address,
          state: prev.state || normalizeRegionCode(savedCountry, parsed.state),
          city: prev.city || data.city || '',
          zip: prev.zip || data.postal_code || '',
          country: shouldUseSavedCountry ? savedCountry : prev.country || savedCountry,
          phoneCountry: prev.phoneCountry || savedCountry,
        };
      });
    };

    loadDefaultAddress();
  }, [isAuthenticated, user?.id]);

  // Validate city when state changes
  useEffect(() => {
    if (!formData.state) {
      return;
    }

    if (manualLocationFields) {
      return;
    }
    
    const normalizedState = normalizeRegionCode(formData.country, formData.state);
    if (normalizedState && normalizedState !== formData.state) {
      setFormData((prev) => ({
        ...prev,
        state: normalizedState,
        city: '',
      }));
      return;
    }

    if (usesManualCityField(formData.country, normalizedState)) {
      return;
    }

    const validCities = getCityOptions(formData.country, normalizedState);
    if (formData.city && !validCities.includes(formData.city)) {
      // City is not in the new state, clear it
      setFormData((prev) => ({
        ...prev,
        city: '',
      }));
    }
  }, [formData.state, formData.country, formData.city, manualLocationFields]);

  // Calculate totals (all amounts in USD, rounded to 2 decimal places)
  const subtotal = Math.round(
    cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
      return sum + price * item.quantity;
    }, 0) * 100
  ) / 100;

  const shipping = calculateShipping(subtotal);
  const vatSummary = calculateVariableVat(
    cartItems.map((item) => ({
      productId: item.product_id,
      title: item.title,
      unitPrice: parseFloat(item.price.replace(/[^\d.]/g, '') || '0'),
      quantity: item.quantity,
    }))
  );
  const vat = vatSummary.totalVat;

  const resolvedOffer = trpc.offers.resolve.useQuery(
    { code: metaCoupon || '', subtotal },
    {
      enabled: isMetaCheckout && Boolean(metaCoupon) && subtotal > 0,
    }
  );

  // If user applies a coupon via the UI, resolvedOffer is only used for meta coupon flows.
  const finalAppliedOffer = appliedOfferData || resolvedOffer.data || null;

  const legacyCouponPercent = isMetaCheckout && !resolvedOffer.data ? parseMetaCouponPercent(metaCoupon) : 0;
  const offerDiscountAmount = finalAppliedOffer
    ? finalAppliedOffer.discountAmount
    : Math.round((subtotal * (legacyCouponPercent / 100)) * 100) / 100;
  const couponLabel = finalAppliedOffer
    ? `${finalAppliedOffer.name} (${finalAppliedOffer.code})`
    : legacyCouponPercent > 0 && metaCoupon
      ? `Coupon (${metaCoupon})`
      : null;
  const total = Math.round((subtotal + shipping + vat - offerDiscountAmount) * 100) / 100; // Ensure final total is precise
  const cartGrandTotal = total;

  useEffect(() => {
    if (cartItems.length === 0 || total <= 0) return;
    const signature = cartItems
      .map((item) => `${item.product_id}:${item.quantity}`)
      .sort()
      .join('|');
    const key = `motorvault_initiate_checkout:${signature}:${total.toFixed(2)}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Continue tracking if storage is unavailable.
    }

    trackInitiateCheckout(
      cartItems.map((item) => item.product_id),
      cartItems.map((item) => item.title),
      total,
      cartItems.reduce((sum, item) => sum + item.quantity, 0),
      'USD'
    );
  }, [cartItems, total]);

  const trackConfirmedPurchase = (
    reference: string | null | undefined,
    orderId: string | null | undefined,
    amount: number | null | undefined,
    currency: string | null | undefined
  ) => {
    const purchaseItems = cartItems.length > 0 ? cartItems : readCheckoutSnapshot();
    const purchaseReference = reference?.trim() || '';
    if (purchaseReference && hasTrackedMetaPurchase(purchaseReference)) {
      return;
    }

    const resolvedAmount = Number(amount);
    const resolvedCurrency = currency?.trim().toUpperCase();
    if (
      !Number.isFinite(resolvedAmount) ||
      resolvedAmount <= 0 ||
      !resolvedCurrency ||
      !/^[A-Z]{3}$/.test(resolvedCurrency) ||
      purchaseItems.length === 0
    ) {
      return;
    }

    const contentIds = purchaseItems.map((item) => item.product_id);
    const contentNames = purchaseItems.map((item) => item.title);
    const numItems = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);

    trackPurchase(
      contentIds,
      contentNames,
      Math.round(resolvedAmount * 100) / 100,
      numItems,
      orderId || purchaseReference || undefined,
      resolvedCurrency
    );

    if (purchaseReference) {
      markTrackedMetaPurchase(purchaseReference);
    }
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'visa',
      name: 'Visa',
      icon: <img src="https://www.svgrepo.com/show/76111/visa-pay-logo.svg" alt="Visa logo" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%221a1f71%22 width=%2248%22 height=%2248%22/%3E%3Ctext x=%2724%22 y=%2726%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2218%22 font-weight=%22bold%22%3EV%3C/text%3E%3C/svg%3E'; }} />,
      description: 'Pay securely with your Visa card through Paystack'
    },
    {
      id: 'mastercard',
      name: 'Mastercard',
      icon: <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXnXkBmw2uSAI7UPnfI8ZWleOP_9jguz46rQ&s" alt="Mastercard logo" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%22ff5f00%22 width=%2224%22 height=%2248%22/%3E%3Crect fill=%22d2001d%22 x=%2724%22 width=%2224%22 height=%2248%22/%3E%3C/svg%3E'; }} />,
      description: 'Pay securely with your Mastercard through Paystack'
    },
    {
      id: 'applePay',
      name: 'Apple Pay',
      icon: <img src="https://cdn-icons-png.flaticon.com/512/5968/5968500.png" alt="Apple Pay logo" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%22000000%22 width=%2248%22 height=%2248%22/%3E%3Ctext x=%2224%22 y=%2726%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2218%22 font-weight=%22bold%22%3E%26%23xf179;%3C/text%3E%3C/svg%3E'; }} />,
      description: 'Coming soon to your region',
      disabled: true
    }
  ];

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = (() => {
      if (name === 'firstName' || name === 'lastName') return sanitizeNameInput(value, 60);
      if (name === 'email') return sanitizeEmail(value, 255);
      if (name === 'address') return sanitizeTextInput(value, 255);
      if (name === 'city') return sanitizeTextInput(value, 80);
      if (name === 'state') {
        const nextState = sanitizeTextInput(value, 80);
        return manualLocationFields ? nextState : normalizeRegionCode(formData.country, nextState);
      }
      if (name === 'zip') return sanitizePostalCode(value, 16);
      if (name === 'country') return sanitizeTextInput(value, 8).toUpperCase();
      if (name === 'phoneCountry') return sanitizeTextInput(value, 8).toUpperCase();
      return sanitizeTextInput(value, 255);
    })();

    if (name === 'country') {
      setFormData(prev => ({
        ...prev,
        country: sanitizedValue,
        phoneCountry: !prev.phoneCountry || prev.phoneCountry === prev.country ? sanitizedValue : prev.phoneCountry,
        state: '',
        city: '',
      }));
    } else if (name === 'phoneCountry') {
      setFormData(prev => ({
        ...prev,
        phoneCountry: sanitizedValue,
      }));
    } else if (name === 'state') {
      setFormData(prev => ({
        ...prev,
        state: sanitizedValue,
        city: '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    }
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, phone: sanitizePhoneInput(value, 24) }));
    // Clear phone error when user starts typing
    if (formErrors.phone) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.phone;
        return updated;
      });
    }
  };

  const handlePhoneBlur = () => {
    setFormData((prev) => ({
      ...prev,
      phone: formatLocalPhoneNumber(normalizeLocalPhoneDigits(prev.phone, prev.phoneCountry, 15), prev.phoneCountry),
    }));
  };

  const validateShipping = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (formData.email && !formData.email.includes('@')) errors.email = 'Please enter a valid email';
    if (!formData.phone) errors.phone = 'Phone number is required';
    if (!formData.address) errors.address = 'Street address is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.state) errors.state = 'State is required';
    if (!formData.zip) errors.zip = 'Zip code is required';

    if (!usesManualLocationFields(formData.country)) {
      const availableStateOptions = getStateOptions(formData.country).filter((option) => option.value);
      const selectedStateUsesManualCity = usesManualCityField(formData.country, formData.state);
      const availableCityOptions = getCityOptions(formData.country, formData.state);
      if (!availableStateOptions.some((option) => option.value === formData.state)) {
        errors.state = `${getStateLabel(formData.country)} must be selected from the list`;
      }
      if (!selectedStateUsesManualCity && !availableCityOptions.includes(formData.city)) {
        errors.city = 'City must be selected from the list';
      }
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix all errors before continuing');
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (!selectedPayment) {
      toast.error('Please select a payment method to continue');
      return false;
    }
    return true;
  };

  const saveCheckoutAddress = async () => {
    if (isMetaCheckout) {
      return true;
    }

    if (!isAuthenticated || !user?.id) {
      toast.error(checkoutText('checkout.addressSaveSignInRequired', 'Please sign in to save your shipping address'));
      return false;
    }

    setIsSavingAddress(true);
    try {
      const normalized = (value: string | null | undefined) => String(value || '').trim().toLowerCase();
      const nextAddressLine = composeAddressLine(sanitizeText(formData.address, 255), sanitizeText(formData.state, 32));
      const nextAddressPayload = {
        user_id: user.id,
        country: sanitizeText(formData.country, 8).toUpperCase(),
        city: sanitizeText(formData.city, 80),
        address_line: nextAddressLine,
        postal_code: sanitizePostalCode(formData.zip, 16),
      };

      const { data: existingAddress, error: existingAddressError } = await supabase
        .from('addresses')
        .select('id, country, city, address_line, postal_code, is_default, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAddressError) throw existingAddressError;

      if (!existingAddress) {
        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            ...nextAddressPayload,
            is_default: true,
        });
        if (insertError) throw insertError;
        toast.success(checkoutText('checkout.addressSaved', 'Shipping address saved for future checkout'));
        return true;
      }

      const sameAddress =
        normalized(existingAddress.country) === normalized(nextAddressPayload.country) &&
        normalized(existingAddress.city) === normalized(nextAddressPayload.city) &&
        normalized(existingAddress.address_line) === normalized(nextAddressPayload.address_line) &&
        normalized(existingAddress.postal_code) === normalized(nextAddressPayload.postal_code);

      if (sameAddress) {
        // Keep same address reusable as default.
        if (!existingAddress.is_default) {
          const { error: unsetError } = await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .eq('is_default', true);
          if (unsetError) throw unsetError;

          const { error: promoteError } = await supabase
            .from('addresses')
            .update({ is_default: true })
            .eq('id', existingAddress.id);
          if (promoteError) throw promoteError;
        }
        return true;
      }

      const shouldUpdateDefault = window.confirm(
        checkoutText(
          'checkout.addressUpdateConfirm',
          'You entered a different shipping address from your saved one. Update your saved address to this new address?'
        )
      );

      if (shouldUpdateDefault) {
        const { error: unsetError } = await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
        if (unsetError) throw unsetError;

        const { error: updateError } = await supabase
          .from('addresses')
          .update({
            ...nextAddressPayload,
            is_default: true,
          })
          .eq('id', existingAddress.id);
        if (updateError) throw updateError;

        toast.success(checkoutText('checkout.addressUpdated', 'Saved shipping address updated'));
      } else {
        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            ...nextAddressPayload,
            is_default: false,
          });
        if (insertError) throw insertError;

        toast.info(checkoutText('checkout.addressKept', 'Using new address for this checkout. Saved default remains unchanged.'));
      }

      return true;
    } catch (error) {
      console.error('[Checkout] Failed to save shipping address:', error);
      toast.error(checkoutText('checkout.addressSaveFailed', 'Failed to save shipping address'));
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (isMetaCheckout) {
      if (!validateShipping()) return;
      setStep('payment');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      // Inline auth UI is shown above for unauthenticated users.
      toast.error('Please sign in using the form above to continue');
      return;
    }

    if (!validateShipping()) return;

    const saved = await saveCheckoutAddress();
    if (!saved) return;

    setStep('payment');
  };

  const handlePaystackPayment = async () => {
    setIsProcessing(true);
    try {
      writeCheckoutSnapshot(cartItems);

      const fullPhoneNumber = buildInternationalPhoneNumber(formData.phoneCountry, formData.phone);

      // Tutorial 2: Generate unique reference (Tutorial 3 UUID approach)
      const paymentReference = generateUUID();
      const provisionalOrderId = `ORD-${Date.now()}`;

      const paystackInitPayload = {
        email: sanitizeEmail(formData.email, 255),
        amount: Math.round(total * 100), // Convert USD total to cents (Paystack expects cents for USD)
        reference: paymentReference,
        currency: 'USD', // Always USD
        channels: ['card'],
        description: `Order from Modern E-commerce - ${cartItems.length} items`,
        metadata: {
          userDbId: typeof user?.id === 'number' ? user.id : undefined,
          userOpenId:
            typeof (user as any)?.openId === 'string'
              ? (user as any).openId
              : typeof user?.id === 'string'
                ? user.id
                : undefined,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: provisionalOrderId,
            },
          ],
          orderId: provisionalOrderId,
          subtotal,
          shipping,
          tax: vat,
          discountAmount: offerDiscountAmount,
          total,
          name: `${sanitizeName(formData.firstName, 60)} ${sanitizeName(formData.lastName, 60)}`.trim(),
          phone: sanitizePhone(fullPhoneNumber, 24),
          phoneCountry: formData.phoneCountry,
          address: sanitizeText(formData.address, 255),
          city: sanitizeText(formData.city, 80),
          state: sanitizeText(formData.state, 32),
          zip: sanitizePostalCode(formData.zip, 16),
          country: sanitizeText(formData.country, 8).toUpperCase(),
          items: cartItems.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
          coupon: couponCodeInput || metaCoupon || undefined,
          offerId: finalAppliedOffer?.id ?? undefined,
          offerCode: finalAppliedOffer?.code ?? metaCoupon ?? undefined,
          offerType: finalAppliedOffer?.type ?? undefined,
          offerValue: finalAppliedOffer?.value ?? (legacyCouponPercent > 0 ? String(legacyCouponPercent) : undefined),
          offerName: finalAppliedOffer?.name ?? undefined,
          couponPercent: legacyCouponPercent || undefined,
          cartOrigin: metaParams.cart_origin,
          fbclid: metaParams.fbclid,
          utmSource: metaParams.utm_source,
          utmMedium: metaParams.utm_medium,
          utmCampaign: metaParams.utm_campaign,
          utmContent: metaParams.utm_content,
        },
      };

      // Tutorial 2: Initialize transaction on server first
      const initResponse = await trpcClient.paystack.transactions.initialize.mutate(paystackInitPayload);

      if (!initResponse.data?.authorization_url) {
        throw new Error('Server failed to return authorization URL');
      }

      // Redirect to Paystack checkout page; the backend callback will verify and create the order.
      window.location.href = initResponse.data.authorization_url;
      return;
    } catch (error) {
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      toast.error(errorMessage);
      console.error('[Checkout] Paystack error:', error);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      await handlePaystackPayment();
    } catch (error) {
      setIsProcessing(false);
      toast.error('Payment failed');
    }
  };

  const handlePaymentSuccess = async (method: string, reference: string) => {
    setIsProcessing(false);

    // Clear cart in the source of truth
    if (isAuthenticated) {
      await clearSupabaseCart();
    }
    localStorage.removeItem('cart');
    localStorage.removeItem('checkout-form-data');
    localStorage.removeItem('checkout-step');
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Show success message
    toast.success('Order placed successfully!');
    
    // Redirect to orders page
    setTimeout(() => {
      navigate('/orders');
    }, 1500);
  };

  const handlePayment = async () => {
    if (cartItems.length === 0 || total <= 0) {
      toast.error('Your cart is empty. Please add items before checkout.');
      return;
    }

    if (!validateShipping()) {
      return;
    }

    if (!validatePayment()) {
      return;
    }

    switch (selectedPayment) {
      case 'visa':
      case 'mastercard':
        await handleCardPayment();
        break;
    }
  };

  // Only skip rendering during SSR; always render in the browser so
  // the inline auth UI is available even while session restoration
  // or network requests are in-flight.
  if (typeof window === 'undefined') {
    return null;
  }

  // Avoid hiding the full checkout UI during transient auth/cart loading on refresh.
  // Only show the skeleton while the initial session restoration is in-flight.
  if (!sessionRestored && authLoading) {
    return (
      <div className="min-h-screen bg-white w-full overflow-x-hidden">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16 animate-pulse">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>

          <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-24 bg-gray-100 rounded border border-gray-200" />
              <div className="bg-white border border-gray-200 rounded p-6 space-y-4">
                <div className="h-7 w-48 bg-gray-200 rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="h-11 bg-gray-100 rounded" />
                  <div className="h-11 bg-gray-100 rounded" />
                </div>
                <div className="h-11 bg-gray-100 rounded" />
                <div className="h-11 bg-gray-100 rounded" />
                <div className="h-11 bg-gray-100 rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="h-11 bg-gray-100 rounded" />
                  <div className="h-11 bg-gray-100 rounded" />
                  <div className="h-11 bg-gray-100 rounded" />
                </div>
                <div className="h-12 bg-gray-200 rounded" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded p-6 space-y-4 h-fit">
              <div className="h-6 w-36 bg-gray-200 rounded" />
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
              <div className="h-px bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
              </div>
              <div className="h-px bg-gray-200" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isMetaCheckout && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2">Checkout</h1>
            <p className="text-gray-600">Complete your purchase securely</p>
          </div>

          {/* Inline Auth */}
          <InlineCheckoutAuth />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-6 sm:mb-8 md:mb-12 px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-black">{t('checkout.secureCheckout', 'Secure Checkout')}</h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{t('checkout.completeCheckoutMessage', 'Complete your purchase safely and quickly')}</p>
          <div className="mt-5">
            <TrustSignals compact />
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 w-full min-w-0">
            {/* Steps - Refined Indicator */}
            <div className="mb-6 sm:mb-8 md:mb-12 px-0 py-6 sm:py-8 bg-white border border-gray-200 rounded overflow-x-auto">
                <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 min-w-max sm:min-w-0">
                {[
                  { label: t('checkout.shipping', 'Shipping'), id: 'shipping' },
                  { label: t('checkout.payment', 'Payment'), id: 'payment' },
                  { label: t('checkout.review', 'Review'), id: 'review' }
                ].map((item, idx, array) => {
                  const stepOrder = ['shipping', 'payment', 'review'];
                  const currentIdx = stepOrder.indexOf(step);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={item.id} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isCurrent
                              ? 'bg-black text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={24} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <p className={`mt-3 text-sm font-semibold ${
                          isCurrent ? 'text-black' : 'text-gray-600'
                        }`}>
                          {item.label}
                        </p>
                      </div>
                      {idx < array.length - 1 && (
                    <div className="h-2 flex-1 mx-1 sm:mx-2 hidden sm:block"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Step */}
            {step === 'shipping' && (
              <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 mb-6 w-full">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.shippingAddress', 'Shipping Address')}</h2>
                
                <form className="space-y-5 sm:space-y-6">
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleShippingChange}
                        placeholder="John"
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.firstName
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.firstName && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleShippingChange}
                        placeholder="Doe"
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.lastName
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.lastName && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleShippingChange}
                      placeholder="john@example.com"
                      className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                        formErrors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-black focus:ring-black'
                      }`}
                      required
                    />
                    {formErrors.email && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Phone Number *</label>
                    <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                      <div>
                        <label className="sr-only" htmlFor="phoneCountry">Phone country code</label>
                        <select
                          id="phoneCountry"
                          name="phoneCountry"
                          value={formData.phoneCountry}
                          onChange={handleShippingChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors text-base bg-white"
                          aria-label="Select phone country code"
                        >
                          {COUNTRY_PHONE_OPTIONS.map((countryOption) => (
                            <option key={countryOption.value} value={countryOption.value}>
                              {getCountryPhoneLabel(countryOption.value)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="(555)-123-4567"
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.phone
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleShippingChange}
                      placeholder="123 Main St"
                      className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                        formErrors.address
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-black focus:ring-black'
                      }`}
                      required
                    />
                    {formErrors.address && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.address}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">{t('checkout.country', 'Country')} *</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors text-base bg-white"
                      required
                    >
                      <option value="">Select country</option>
                      {COUNTRY_OPTIONS.map((countryOption) => (
                        <option key={countryOption.value} value={countryOption.value}>
                          {countryOption.flag ? `${countryOption.flag} ` : ''}{countryOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{getStateLabel(formData.country)} *</label>
                      {manualLocationFields ? (
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleShippingChange}
                          placeholder={getStateLabel(formData.country)}
                          className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                            formErrors.state
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-black focus:ring-black'
                          }`}
                          required
                        />
                      ) : (
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleShippingChange}
                          className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white ${
                            formErrors.state
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-black focus:ring-black'
                          }`}
                          required
                        >
                          <option value="">{t('checkout.selectState', 'Select')} {getStateLabel(formData.country).toLowerCase()}</option>
                          {structuredStateOptions.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {formErrors.state && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.state}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{t('checkout.city', 'City')} *</label>
                      {manualCityField ? (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleShippingChange}
                          placeholder={t('checkout.city', 'City')}
                          className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                            formErrors.city
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-black focus:ring-black'
                          }`}
                          required
                        />
                      ) : (
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleShippingChange}
                          disabled={!formData.state}
                          className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white disabled:bg-gray-100 disabled:text-gray-500 ${
                            formErrors.city
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-black focus:ring-black'
                          }`}
                          required
                        >
                          <option value="">{t('checkout.selectCity', 'Select city')}</option>
                          {cityOptions.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      )}
                      {formErrors.city && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.city}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{getPostalCodeLabel(formData.country)} *</label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleShippingChange}
                        placeholder={t('checkout.zipPlaceholder', '10001')}
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.zip
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.zip && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.zip}
                        </p>
                      )}
                    </div>
                  </div>

                  {isAuthenticated && (
                    <div className="p-4 rounded border border-gray-200 bg-gray-50 text-sm text-gray-700">
                      Shipping addresses are saved automatically for future checkout. If you use a different address, you will be asked whether to update your saved address.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleContinueToPayment}
                    disabled={isSavingAddress}
                    className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isSavingAddress ? 'Saving Address...' : 'Continue to Payment'}
                    <ChevronRight size={20} />
                  </button>
                </form>
              </div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="space-y-6">
                {/* Payment Methods */}
                <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.paymentMethod', 'Payment Method')}</h2>
                  
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 mb-6 sm:mb-8">
                    {paymentMethods.map(method => (
                      <button
                        key={method.id}
                        onClick={() => {
                          if (method.disabled) {
                            toast.info('Coming soon to your region');
                            return;
                          }
                          setSelectedPayment(method.id);
                        }}
                        disabled={method.disabled}
                        className={`p-4 sm:p-6 rounded border transition-all text-left ${
                          method.disabled 
                            ? 'border-gray-200 bg-gray-50 text-gray-500 opacity-60 cursor-not-allowed'
                            : selectedPayment === method.id
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 hover:border-gray-400 bg-white text-black'
                        }`}
                      >
                        <div className={`flex items-center gap-3 mb-2 ${selectedPayment === method.id && !method.disabled ? 'opacity-100' : 'opacity-70'}`}>
                          {method.icon}
                          <h3 className="font-bold">{method.name}</h3>
                        </div>
                        <p className={`text-sm ${
                          selectedPayment === method.id && !method.disabled
                            ? 'text-gray-100' 
                            : method.disabled
                            ? 'text-gray-500'
                            : 'text-gray-600'
                        }`}>
                          {method.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Security Info */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded flex gap-3">
                    <Lock className="text-green-700 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-green-900">{t('checkout.secureEncrypted', 'Secure & Encrypted')}</p>
                      <p className="text-xs text-green-700">{t('checkout.paymentSecure', 'Your payment information is encrypted and secure')}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setStep('shipping')}
                    className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-black font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    onClick={() => {
                      if (validatePayment()) {
                        setStep('review');
                      }
                    }}
                    className="flex-1 bg-black hover:bg-gray-900 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {t('checkout.reviewOrder', 'Review Order')}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <div className="space-y-4 sm:space-y-6 w-full">
                {/* Order Summary */}
                <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.reviewYourOrder', 'Review Your Order')}</h2>

                  {/* Shipping Summary */}
                  <div className="pb-6 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-black">{t('checkout.shippingTo', 'Shipping To')}</h3>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {formData.firstName} {formData.lastName}<br />
                      {formData.address}<br />
                      {formData.city}, {formData.state} {formData.zip}<br />
                      {formData.phone}
                    </p>
                  </div>

                  {/* Payment Summary */}
                  <div className="py-6 border-b border-gray-200">
                    <h3 className="font-bold text-black mb-3">{t('checkout.paymentMethod', 'Payment Method')}</h3>
                    <p className="text-gray-700">
                      {paymentMethods.find(m => m.id === selectedPayment)?.name}
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="py-6">
                    <h3 className="font-bold text-black mb-4">{t('checkout.items', 'Items')} ({cartItems.length})</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {`${currencyClient.getCurrencySymbolLocal()}${(currencyClient.convertUSD(parseFloat(item.price.replace(/[^\d.]/g, '') || '')) * item.quantity).toFixed(2)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setStep('payment')}
                    className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-black font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {isProcessing ? t('checkout.processing', 'Processing...') : `${t('checkout.payNow', 'Pay Now')} ${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(total).toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1 w-full min-w-0">
            <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8">
              <h3 className="text-base sm:text-lg font-bold mb-6 sm:mb-8 text-black">{t('checkout.orderSummary', 'Order Summary')}</h3>

              {/* Items */}
              <div className="space-y-4 mb-8 pb-8 border-b border-gray-200 max-h-64 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <p className="text-gray-600 text-sm">No items in cart</p>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      {item.image ? (
                        <img
                          src={getHighResImageUrl(item.image)}
                          alt={item.title}
                          className="h-16 w-16 rounded object-contain bg-gray-100 flex-shrink-0"
                          crossOrigin="anonymous"
                          onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2220%22%3ENo image%3C/text%3E%3C/svg%3E'; }}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">×{item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {`${currencyClient.getCurrencySymbolLocal()}${(currencyClient.convertUSD(parseFloat(item.price.replace(/[^\d.]/g, '') || '')) * item.quantity).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
                {/* Coupon Entry */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Have a coupon?</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={couponCodeInput}
                      onChange={(e) => { setCouponCodeInput(e.target.value.trim()); setCouponError(null); }}
                      placeholder="Enter coupon code"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={async () => {
                        if (!couponCodeInput) {
                          setCouponError('Please enter a coupon code');
                          return;
                        }
                        setCouponLoading(true);
                        setCouponError(null);
                        try {
                          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
                          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
                          if (!supabaseUrl || !anonKey) throw new Error('Supabase client not configured');

                          const url = `${supabaseUrl}offers?code=eq.${encodeURIComponent(couponCodeInput.trim())}`;
                          const r = await fetch(url, {
                            headers: {
                              apikey: anonKey,
                              Authorization: `Bearer ${anonKey}`,
                              Accept: 'application/json',
                            },
                          });

                          if (!r.ok) {
                            throw new Error(`Supabase request failed: ${r.status}`);
                          }

                          const body = await r.json();
                          if (!Array.isArray(body) || body.length === 0) {
                            setAppliedOfferData(null);
                            setCouponError('Coupon is not valid or not applicable to your order');
                            return;
                          }

                          const offer = body[0];
                          const now = new Date();
                          if (!offer.active) {
                            setCouponError('Coupon is not active');
                            setAppliedOfferData(null);
                          } else if (offer.startsAt && new Date(offer.startsAt) > now) {
                            setCouponError('Coupon is not yet active');
                            setAppliedOfferData(null);
                          } else if (offer.endsAt && new Date(offer.endsAt) < now) {
                            setCouponError('Coupon has expired');
                            setAppliedOfferData(null);
                          } else if (offer.maxUses !== null && offer.maxUses !== undefined && Number(offer.usedCount ?? 0) >= offer.maxUses) {
                            setCouponError('Coupon has been fully redeemed');
                            setAppliedOfferData(null);
                          } else if (offer.minimumSubtotal && subtotal < Number(offer.minimumSubtotal)) {
                            setCouponError(`Coupon requires minimum subtotal of ${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(Number(offer.minimumSubtotal)).toFixed(2)}`);
                            setAppliedOfferData(null);
                          } else {
                            const numericValue = Number(offer.value);
                            const discountAmount = offer.type === 'percentage'
                              ? Math.round((subtotal * (numericValue / 100)) * 100) / 100
                              : Math.min(numericValue, subtotal);
                            const resolved = {
                              id: offer.id,
                              code: offer.code,
                              name: offer.name,
                              description: offer.description ?? null,
                              type: offer.type,
                              value: String(offer.value),
                              minimumSubtotal: offer.minimumSubtotal ? String(offer.minimumSubtotal) : null,
                              discountAmount: Number(discountAmount.toFixed ? discountAmount.toFixed(2) : discountAmount),
                            };
                            setAppliedOfferData(resolved);
                            toast.success('Coupon applied');
                          }
                        } catch (err) {
                          console.error('[Checkout] Coupon validation failed', err);
                          setCouponError('Failed to validate coupon');
                          setAppliedOfferData(null);
                        } finally {
                          setCouponLoading(false);
                        }
                      }}
                      disabled={couponLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                      {couponLoading ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
                  {appliedOfferData && (
                    <div className="mt-2 text-sm text-green-700 flex items-center justify-between">
                      <span>{`${appliedOfferData.name} (${appliedOfferData.code}) applied`}</span>
                      <button
                        onClick={() => { setAppliedOfferData(null); setCouponCodeInput(''); toast.success('Coupon removed'); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.subtotal', 'Subtotal')}</span>
                  <span className="font-medium text-gray-900">{`${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(subtotal).toFixed(2)}`}</span>
                </div>
                {offerDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{couponLabel || 'Discount'}</span>
                    <span className="font-medium text-green-700">-{offerDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.estimatedShipping', 'Estimated shipping')}</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'font-medium text-gray-900'}>
                    {shipping === 0 ? t('checkout.free', 'FREE') : `${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(shipping).toFixed(2)}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('checkout.shippingEstimateDisclaimer', 'Shipping shown is an estimate. Final shipping is confirmed at checkout.')}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.vat', 'V.A.T')}</span>
                  <span className="font-medium text-gray-900">{`${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(vat).toFixed(2)}`}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600">{t('checkout.total', 'Total')}</span>
                    <span className="text-3xl font-bold text-black">{`${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(cartGrandTotal).toFixed(2)}`}</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.freeShipping', `Free shipping on orders over ${currencyClient.getCurrencySymbolLocal()}${currencyClient.convertUSD(getFreeShippingThresholdUsd()).toFixed(2)}`)}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.returnPolicy', '30-day return policy')}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.securePayments', 'Secure encrypted payments')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
