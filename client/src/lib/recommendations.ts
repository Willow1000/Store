import { Product } from '@/types/supabase';

export const RECOMMENDATION_PROFILE_CHANGED_EVENT = 'motorvault:recommendation-profile-changed';

const PROFILE_VERSION = 1;
const PROFILE_KEY_PREFIX = 'motorvault_recommendation_profile_v1';
const SESSION_ID_KEY = 'sessionId';
const MAX_RECENT_SEARCHES = 24;
const MAX_RECENT_PRODUCT_IDS = 40;
const MAX_WEIGHT = 220;
const LATEST_INTENT_WINDOW_MS = 6 * 60 * 60 * 1000;

export type RecommendationEventType =
  | 'search'
  | 'product_view'
  | 'product_click'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'quantity_change'
  | 'purchase'
  | 'category_view'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'recommendation_impression'
  | 'recommendation_click'
  | 'recommendation_conversion';

export type VehicleContext = {
  brand?: string;
  model?: string;
  generation?: string;
  category?: string;
  confidence: number;
  updatedAt: string;
};

export type SearchIntent = {
  raw: string;
  tokens: string[];
  category?: string;
  brand?: string;
  model?: string;
  productBrand?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
};

export type InterestProfile = {
  version: number;
  scope: string;
  sessionId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  brandWeights: Record<string, number>;
  categoryWeights: Record<string, number>;
  modelWeights: Record<string, number>;
  vehicleBrandWeights: Record<string, number>;
  vehicleModelWeights: Record<string, number>;
  termWeights: Record<string, number>;
  productWeights: Record<string, number>;
  eventCounts: Record<string, number>;
  recentSearches: Array<SearchIntent & { at: string }>;
  recentlyViewedProductIds: string[];
  cartProductIds: string[];
  purchasedProductIds: string[];
  wishlistedProductIds: string[];
  vehicleContext?: VehicleContext;
  lastMergedGuestUpdatedAt?: string | null;
};

export type RecommendationSignalEvent = {
  eventType: RecommendationEventType;
  product?: Partial<Product> | null;
  products?: Array<Partial<Product> | null | undefined>;
  productId?: string | number | null;
  searchTerm?: string | null;
  category?: string | null;
  quantity?: number | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export type SmartScoreBreakdown = {
  searchRelevance: number;
  brandAffinity: number;
  vehicleAffinity: number;
  categoryAffinity: number;
  purchaseHistory: number;
  dealScore: number;
  popularity: number;
  stock: number;
  recency: number;
  total: number;
};

export type ScoredProduct<T extends Partial<Product> = Product> = {
  product: T;
  score: number;
  breakdown: SmartScoreBreakdown;
};

const VEHICLE_BRANDS = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Citroen', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln',
  'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan',
  'Opel', 'Peugeot', 'Porsche', 'Ram', 'Renault', 'Saab', 'Seat', 'Skoda', 'Subaru',
  'Tesla', 'Toyota', 'Vauxhall', 'Volkswagen', 'Volvo', 'VW',
];

const PRODUCT_BRANDS = [
  'Michelin', 'Continental', 'Pirelli', 'Bridgestone', 'Goodyear', 'Dunlop', 'Hankook',
  'Yokohama', 'Brembo', 'Bosch', 'NGK', 'Mann', 'Mann-Filter', 'Bilstein', 'Monroe',
  'Valeo', 'Hella', 'Denso', 'Febi', 'Meyle', 'Lemforder',
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  Tires: ['tire', 'tires', 'tyre', 'tyres', 'wheel tire', 'wheels tires'],
  Wheels: ['wheel', 'wheels', 'rim', 'rims', 'alloy'],
  Brakes: ['brake', 'brakes', 'brake pad', 'brake pads', 'rotor', 'rotors', 'caliper', 'sensor'],
  Suspension: ['suspension', 'shock', 'shocks', 'strut', 'struts', 'control arm', 'spring'],
  Bumpers: ['bumper', 'bumpers', 'front bumper', 'rear bumper'],
  Headlights: ['headlight', 'headlights', 'lamp', 'lamps', 'fog light', 'fog lights'],
  Transmission: ['transmission', 'gearbox', 'clutch', 'driveline'],
  Engine: ['engine', 'motor', 'spark plug', 'filter', 'oil', 'turbo'],
  Interior: ['interior', 'seat', 'seats', 'dashboard', 'trim'],
  Exhaust: ['exhaust', 'muffler', 'catalytic', 'downpipe'],
  Body: ['body', 'fender', 'hood', 'door', 'mirror', 'grille', 'grill'],
};

const RELATED_CATEGORIES: Record<string, string[]> = {
  Tires: ['Wheels', 'Brakes', 'Suspension'],
  Wheels: ['Tires', 'Brakes', 'Suspension'],
  Brakes: ['Brake Sensors', 'Brake Rotors', 'Suspension', 'Tires'],
  Bumpers: ['Headlights', 'Fog Lights', 'Grilles', 'Sensors', 'Mounting Clips', 'Body'],
  Headlights: ['Fog Lights', 'Bumpers', 'Sensors', 'Body'],
  Suspension: ['Tires', 'Wheels', 'Brakes'],
  Transmission: ['Engine', 'Clutch', 'Driveline'],
  Engine: ['Transmission', 'Exhaust', 'Filters'],
  Interior: ['Seats', 'Trim', 'Electronics'],
};

const PREMIUM_TIRE_BRANDS = ['Michelin', 'Continental', 'Pirelli', 'Bridgestone', 'Goodyear', 'Dunlop'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
  'part', 'parts', 'auto', 'car', 'vehicle', 'shop', 'buy', 'new', 'used',
]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function titleize(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/^[A-Z0-9-]{2,}$/.test(normalized)) return normalized;
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function canonicalVehicleBrand(value: string): string {
  const normalized = normalizeKey(value);
  if (normalized === 'vw') return 'Volkswagen';
  if (normalized === 'mercedes benz' || normalized === 'mercedes') return 'Mercedes-Benz';
  if (normalized === 'bmw') return 'BMW';
  return titleize(value);
}

function canonicalCategory(value: string): string {
  const normalized = normalizeKey(value);
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (normalizeKey(category) === normalized || aliases.some((alias) => normalizeKey(alias) === normalized)) {
      return category;
    }
  }
  return titleize(value);
}

function makeEmptyProfile(scope: string, userId?: string | null): InterestProfile {
  const sessionId = getRecommendationSessionId();
  const createdAt = nowIso();
  return {
    version: PROFILE_VERSION,
    scope,
    sessionId,
    userId: userId ?? null,
    createdAt,
    updatedAt: createdAt,
    brandWeights: {},
    categoryWeights: {},
    modelWeights: {},
    vehicleBrandWeights: {},
    vehicleModelWeights: {},
    termWeights: {},
    productWeights: {},
    eventCounts: {},
    recentSearches: [],
    recentlyViewedProductIds: [],
    cartProductIds: [],
    purchasedProductIds: [],
    wishlistedProductIds: [],
    lastMergedGuestUpdatedAt: null,
  };
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_WEIGHT, Math.round(value * 100) / 100));
}

function addWeight(weights: Record<string, number>, key: unknown, amount: number) {
  const normalized = normalizeKey(key);
  if (!normalized || !Number.isFinite(amount)) return;
  weights[normalized] = clampWeight((weights[normalized] || 0) + amount);
}

function readProfileKey(scope: string) {
  return `${PROFILE_KEY_PREFIX}:${scope}`;
}

function getScope(userId?: string | null) {
  return userId ? `user:${userId}` : 'guest';
}

function readStoredProfile(scope: string, userId?: string | null): InterestProfile {
  if (typeof window === 'undefined') return makeEmptyProfile(scope, userId);

  try {
    const raw = localStorage.getItem(readProfileKey(scope));
    if (!raw) return makeEmptyProfile(scope, userId);
    const parsed = JSON.parse(raw) as Partial<InterestProfile>;
    if (parsed.version !== PROFILE_VERSION) return makeEmptyProfile(scope, userId);
    return {
      ...makeEmptyProfile(scope, userId),
      ...parsed,
      scope,
      sessionId: parsed.sessionId || getRecommendationSessionId(),
      userId: userId ?? parsed.userId ?? null,
    };
  } catch {
    return makeEmptyProfile(scope, userId);
  }
}

function writeStoredProfile(profile: InterestProfile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(readProfileKey(profile.scope), JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(RECOMMENDATION_PROFILE_CHANGED_EVENT, { detail: profile }));
  } catch {
    // Keep personalization best-effort when storage is unavailable.
  }
}

function pushUnique(items: string[], value: unknown, limit = MAX_RECENT_PRODUCT_IDS): string[] {
  const id = String(value ?? '').trim();
  if (!id) return items;
  return [id, ...items.filter((item) => item !== id)].slice(0, limit);
}

function removeValue(items: string[], value: unknown): string[] {
  const id = String(value ?? '').trim();
  if (!id) return items;
  return items.filter((item) => item !== id);
}

function mergeWeights(target: Record<string, number>, source: Record<string, number>, multiplier = 1) {
  for (const [key, value] of Object.entries(source || {})) {
    addWeight(target, key, value * multiplier);
  }
}

function mergeUnique(target: string[], source: string[], limit = MAX_RECENT_PRODUCT_IDS): string[] {
  let next = target.slice();
  for (const value of source || []) {
    next = pushUnique(next, value, limit);
  }
  return next;
}

function mergeProfiles(primary: InterestProfile, secondary: InterestProfile): InterestProfile {
  const merged: InterestProfile = {
    ...primary,
    brandWeights: { ...primary.brandWeights },
    categoryWeights: { ...primary.categoryWeights },
    modelWeights: { ...primary.modelWeights },
    vehicleBrandWeights: { ...primary.vehicleBrandWeights },
    vehicleModelWeights: { ...primary.vehicleModelWeights },
    termWeights: { ...primary.termWeights },
    productWeights: { ...primary.productWeights },
    eventCounts: { ...primary.eventCounts },
    recentSearches: [...primary.recentSearches],
    recentlyViewedProductIds: [...primary.recentlyViewedProductIds],
    cartProductIds: [...primary.cartProductIds],
    purchasedProductIds: [...primary.purchasedProductIds],
    wishlistedProductIds: [...primary.wishlistedProductIds],
  };

  mergeWeights(merged.brandWeights, secondary.brandWeights, 0.75);
  mergeWeights(merged.categoryWeights, secondary.categoryWeights, 0.75);
  mergeWeights(merged.modelWeights, secondary.modelWeights, 0.75);
  mergeWeights(merged.vehicleBrandWeights, secondary.vehicleBrandWeights, 0.75);
  mergeWeights(merged.vehicleModelWeights, secondary.vehicleModelWeights, 0.75);
  mergeWeights(merged.termWeights, secondary.termWeights, 0.75);
  mergeWeights(merged.productWeights, secondary.productWeights, 0.75);

  for (const [key, value] of Object.entries(secondary.eventCounts || {})) {
    merged.eventCounts[key] = (merged.eventCounts[key] || 0) + value;
  }

  merged.recentSearches = [...primary.recentSearches, ...secondary.recentSearches]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_RECENT_SEARCHES);
  merged.recentlyViewedProductIds = mergeUnique(primary.recentlyViewedProductIds, secondary.recentlyViewedProductIds);
  merged.cartProductIds = mergeUnique(primary.cartProductIds, secondary.cartProductIds);
  merged.purchasedProductIds = mergeUnique(primary.purchasedProductIds, secondary.purchasedProductIds);
  merged.wishlistedProductIds = mergeUnique(primary.wishlistedProductIds, secondary.wishlistedProductIds);

  if (!merged.vehicleContext && secondary.vehicleContext) {
    merged.vehicleContext = secondary.vehicleContext;
  }

  merged.updatedAt = nowIso();
  return merged;
}

export function getRecommendationSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';

  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return `anon-${Date.now()}`;
  }
}

export function getRecommendationProfile(userId?: string | null): InterestProfile {
  const scope = getScope(userId);
  const profile = readStoredProfile(scope, userId);

  if (userId) {
    const guest = readStoredProfile('guest');
    const hasGuestSignals =
      Object.keys(guest.brandWeights).length > 0 ||
      Object.keys(guest.categoryWeights).length > 0 ||
      guest.recentlyViewedProductIds.length > 0 ||
      guest.recentSearches.length > 0;

    if (hasGuestSignals && profile.lastMergedGuestUpdatedAt !== guest.updatedAt) {
      const merged = mergeProfiles(profile, guest);
      merged.lastMergedGuestUpdatedAt = guest.updatedAt;
      writeStoredProfile(merged);
      return merged;
    }
  }

  return profile;
}

export function saveRecommendationProfile(profile: InterestProfile) {
  writeStoredProfile({ ...profile, updatedAt: nowIso() });
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function findAliasMatch(text: string, aliases: string[]): string | undefined {
  const normalized = ` ${normalizeKey(text)} `;
  return aliases.find((alias) => normalized.includes(` ${normalizeKey(alias)} `));
}

function inferCategoryFromText(text: string): string | undefined {
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (findAliasMatch(text, [category, ...aliases])) return category;
  }
  return undefined;
}

function inferKnownBrand(text: string, brands: string[]): string | undefined {
  const normalized = ` ${normalizeKey(text).replace(/-/g, ' ')} `;
  const sortedBrands = [...brands].sort((a, b) => b.length - a.length);
  const match = sortedBrands.find((brand) => normalized.includes(` ${normalizeKey(brand).replace(/-/g, ' ')} `));
  return match;
}

function inferProductBrand(text: string, products?: Array<Partial<Product>>): string | undefined {
  const productBrands = new Set(PRODUCT_BRANDS);
  for (const product of products || []) {
    if (product.brand) productBrands.add(product.brand);
  }
  const match = inferKnownBrand(text, Array.from(productBrands));
  return match ? titleize(match) : undefined;
}

function inferModel(text: string, brand?: string): string | undefined {
  const tokens = text.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const brandIndex = brand
    ? tokens.findIndex((token) => normalizeKey(token) === normalizeKey(brand) || (brand === 'Volkswagen' && normalizeKey(token) === 'vw'))
    : -1;

  const candidate =
    brandIndex >= 0
      ? tokens.slice(brandIndex + 1).find((token) => /^[a-z]?\d{1,3}[a-z0-9-]*$/i.test(token) || /^[a-z]-?class$/i.test(token))
      : tokens.find((token) => /^[a-z]\d{1,3}[a-z0-9-]*$/i.test(token));

  return candidate ? candidate.toUpperCase() : undefined;
}

export function inferSearchIntent(searchTerm: string, products?: Array<Partial<Product>>): SearchIntent {
  const raw = searchTerm.trim();
  const vehicleBrandMatch = inferKnownBrand(raw, VEHICLE_BRANDS);
  const vehicleBrand = vehicleBrandMatch ? canonicalVehicleBrand(vehicleBrandMatch) : undefined;
  const productBrand = inferProductBrand(raw, products);
  const category = inferCategoryFromText(raw);
  const vehicleModel = inferModel(raw, vehicleBrand);

  return {
    raw,
    tokens: tokenize(raw),
    category,
    brand: vehicleBrand || productBrand,
    model: vehicleModel,
    productBrand,
    vehicleBrand,
    vehicleModel,
  };
}

function getProductId(product?: Partial<Product> | null, explicitId?: string | number | null): string {
  return String(explicitId ?? product?.id ?? '').trim();
}

function productText(product: Partial<Product>): string {
  const specifics = product.item_specifics
    ? typeof product.item_specifics === 'string'
      ? product.item_specifics
      : JSON.stringify(product.item_specifics)
    : '';
  return [
    product.title,
    product.brand,
    product.model,
    product.category_name,
    product.part_number,
    specifics,
  ].filter(Boolean).join(' ');
}

function getProductCategory(product?: Partial<Product> | null): string {
  return product?.category_name ? canonicalCategory(product.category_name) : '';
}

function updateVehicleContext(profile: InterestProfile, patch: Partial<VehicleContext>, confidence: number) {
  const next: VehicleContext = {
    ...(profile.vehicleContext || { confidence: 0, updatedAt: nowIso() }),
    ...patch,
    confidence: Math.max(profile.vehicleContext?.confidence || 0, confidence),
    updatedAt: nowIso(),
  };

  profile.vehicleContext = next;
}

function applySearchSignal(profile: InterestProfile, searchTerm: string, products?: Array<Partial<Product>>, multiplier = 1) {
  const intent = inferSearchIntent(searchTerm, products);
  if (!intent.raw) return;

  profile.recentSearches = [{ ...intent, at: nowIso() }, ...profile.recentSearches]
    .filter((entry, index, list) => list.findIndex((other) => normalizeKey(other.raw) === normalizeKey(entry.raw)) === index)
    .slice(0, MAX_RECENT_SEARCHES);

  if (intent.category) addWeight(profile.categoryWeights, intent.category, 44 * multiplier);
  if (intent.productBrand) addWeight(profile.brandWeights, intent.productBrand, 28 * multiplier);
  if (intent.vehicleBrand) {
    addWeight(profile.brandWeights, intent.vehicleBrand, 28 * multiplier);
    addWeight(profile.vehicleBrandWeights, intent.vehicleBrand, 38 * multiplier);
  }
  if (intent.vehicleModel) {
    addWeight(profile.modelWeights, intent.vehicleModel, 28 * multiplier);
    addWeight(profile.vehicleModelWeights, intent.vehicleModel, 34 * multiplier);
  }
  for (const token of intent.tokens) {
    addWeight(profile.termWeights, token, 5 * multiplier);
  }

  if (intent.vehicleBrand || intent.vehicleModel || intent.category) {
    updateVehicleContext(
      profile,
      {
        brand: intent.vehicleBrand || profile.vehicleContext?.brand,
        model: intent.vehicleModel || profile.vehicleContext?.model,
        category: intent.category || profile.vehicleContext?.category,
      },
      intent.vehicleBrand || intent.vehicleModel ? 75 : 40
    );
  }
}

function applyProductSignal(profile: InterestProfile, product: Partial<Product> | null | undefined, amount: number, eventType: RecommendationEventType, explicitProductId?: string | number | null) {
  const productId = getProductId(product, explicitProductId);
  if (productId) addWeight(profile.productWeights, productId, amount * 1.4);

  const category = getProductCategory(product);
  if (category) addWeight(profile.categoryWeights, category, amount);
  if (product?.brand) {
    addWeight(profile.brandWeights, product.brand, amount * 0.9);
    addWeight(profile.vehicleBrandWeights, product.brand, amount * 0.75);
  }
  if (product?.model) {
    addWeight(profile.modelWeights, product.model, amount * 0.8);
    addWeight(profile.vehicleModelWeights, product.model, amount * 0.7);
  }

  if (product?.brand || product?.model || category) {
    updateVehicleContext(
      profile,
      {
        brand: product?.brand ? canonicalVehicleBrand(product.brand) : profile.vehicleContext?.brand,
        model: product?.model ? String(product.model) : profile.vehicleContext?.model,
        category: category || profile.vehicleContext?.category,
      },
      eventType === 'purchase' ? 95 : eventType === 'add_to_cart' ? 85 : 65
    );
  }

  if (productId && eventType === 'product_view') {
    profile.recentlyViewedProductIds = pushUnique(profile.recentlyViewedProductIds, productId);
  }
  if (productId && eventType === 'add_to_cart') {
    profile.cartProductIds = pushUnique(profile.cartProductIds, productId);
  }
  if (productId && eventType === 'remove_from_cart') {
    profile.cartProductIds = removeValue(profile.cartProductIds, productId);
  }
  if (productId && eventType === 'purchase') {
    profile.purchasedProductIds = pushUnique(profile.purchasedProductIds, productId);
  }
  if (productId && eventType === 'wishlist_add') {
    profile.wishlistedProductIds = pushUnique(profile.wishlistedProductIds, productId);
  }
  if (productId && eventType === 'wishlist_remove') {
    profile.wishlistedProductIds = removeValue(profile.wishlistedProductIds, productId);
  }
}

function getEventWeight(eventType: RecommendationEventType, quantity = 1): number {
  const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
  switch (eventType) {
    case 'purchase':
    case 'recommendation_conversion':
      return 48 * qty;
    case 'add_to_cart':
      return 24 * qty;
    case 'wishlist_add':
      return 18;
    case 'product_view':
    case 'recommendation_click':
      return 10;
    case 'product_click':
      return 8;
    case 'quantity_change':
      return 7 * qty;
    case 'remove_from_cart':
    case 'wishlist_remove':
      return -6;
    case 'category_view':
      return 10;
    case 'recommendation_impression':
      return 1;
    case 'search':
    default:
      return 0;
  }
}

export function trackRecommendationEvent(event: RecommendationSignalEvent): InterestProfile {
  const profile = getRecommendationProfile(event.userId);
  const eventType = event.eventType;
  const eventKey = normalizeKey(eventType);
  profile.eventCounts[eventKey] = (profile.eventCounts[eventKey] || 0) + 1;

  if (event.searchTerm) {
    applySearchSignal(profile, event.searchTerm, event.products?.filter(Boolean) as Partial<Product>[] | undefined);
  }

  if (event.category) {
    addWeight(profile.categoryWeights, event.category, eventType === 'category_view' ? 14 : 6);
    updateVehicleContext(profile, { category: canonicalCategory(event.category) }, 35);
  }

  const products = event.products?.filter(Boolean) as Partial<Product>[] | undefined;
  const signalProducts = products && products.length > 0 ? products : event.product ? [event.product] : [];
  const amount = getEventWeight(eventType, event.quantity || 1);
  if (amount !== 0 && signalProducts.length > 0) {
    for (const product of signalProducts) {
      applyProductSignal(profile, product, amount, eventType, event.productId);
    }
  } else if (amount !== 0 && event.productId) {
    applyProductSignal(profile, null, amount, eventType, event.productId);
  }

  profile.updatedAt = nowIso();
  writeStoredProfile(profile);
  void sendRecommendationTrackingEvent(event, profile);
  return profile;
}

export function sendRecommendationTrackingEvent(event: RecommendationSignalEvent, profile = getRecommendationProfile(event.userId)) {
  if (typeof window === 'undefined') return Promise.resolve(false);

  try {
    const productIds = event.products
      ?.map((product) => getProductId(product, null))
      .filter(Boolean) || [];
    const productId = getProductId(event.product, event.productId);
    const body = JSON.stringify({
      sessionId: profile.sessionId || getRecommendationSessionId(),
      userId: event.userId || null,
      eventType: event.eventType,
      searchTerm: event.searchTerm || null,
      filters: {
        category: event.category || event.product?.category_name || null,
        brand: event.product?.brand || null,
        model: event.product?.model || null,
      },
      resultsCount: productIds.length,
      matchedProductIds: productIds.slice(0, 50),
      clickedProductId: productId || null,
      pageUrl: window.location.href,
      referrer: document.referrer || null,
      metadata: {
        ...(event.metadata || {}),
        quantity: event.quantity || undefined,
        vehicleContext: profile.vehicleContext || undefined,
      },
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      return Promise.resolve(true);
    }

    return fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).then(() => true).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

function scoreTextMatch(text: string, value: string, exact: number, contains: number): number {
  const normalizedText = normalizeKey(text);
  const normalizedValue = normalizeKey(value);
  if (!normalizedText || !normalizedValue) return 0;
  if (normalizedText === normalizedValue) return exact;
  if (normalizedText.includes(normalizedValue)) return contains;
  return 0;
}

function productMatchesCategory(product: Partial<Product>, category: string): 'exact' | 'related' | 'none' {
  const productCategory = getProductCategory(product);
  const text = productText(product);
  const canonical = canonicalCategory(category);

  if (
    normalizeKey(productCategory) === normalizeKey(canonical) ||
    findAliasMatch(text, [canonical, ...(CATEGORY_ALIASES[canonical] || [])])
  ) {
    return 'exact';
  }

  const related = RELATED_CATEGORIES[canonical] || [];
  if (related.some((relatedCategory) => normalizeKey(productCategory).includes(normalizeKey(relatedCategory)) || findAliasMatch(text, [relatedCategory, ...(CATEGORY_ALIASES[relatedCategory] || [])]))) {
    return 'related';
  }

  return 'none';
}

function getWeightScore(weights: Record<string, number>, key: unknown, maxScore: number): number {
  const normalized = normalizeKey(key);
  if (!normalized) return 0;
  const weight = weights[normalized] || 0;
  return Math.min(maxScore, (weight / MAX_WEIGHT) * maxScore);
}

export function calculateDealScore(product: Partial<Product>): number {
  const price = Number(product.price || 0);
  const original = Number(product.discount || product.original_price || 0);
  const stock = Number(product.stock ?? 0);
  const discountPercent = original > price && price > 0 ? ((original - price) / original) * 100 : 0;
  const stockScore = stock > 0 ? Math.min(12, Math.log10(stock + 1) * 5) : -8;
  const premiumScore = price >= 1500 ? 6 : 0;
  return Math.max(0, discountPercent * 1.25 + stockScore + premiumScore);
}

function calculateSearchScore(product: Partial<Product>, intent?: SearchIntent, profile?: InterestProfile): number {
  if (!intent?.raw) return 0;

  let score = 0;
  const text = productText(product);
  const title = String(product.title || '');
  const brand = String(product.brand || '');
  const model = String(product.model || '');
  const category = getProductCategory(product);

  score += scoreTextMatch(title, intent.raw, 120, 65);
  score += scoreTextMatch(brand, intent.raw, 95, 55);
  score += scoreTextMatch(model, intent.raw, 85, 50);
  score += scoreTextMatch(category, intent.raw, 80, 45);

  for (const token of intent.tokens) {
    if (normalizeKey(title).includes(token)) score += 12;
    if (normalizeKey(brand).includes(token)) score += 10;
    if (normalizeKey(model).includes(token)) score += 9;
    if (normalizeKey(category).includes(token)) score += 8;
    if (normalizeKey(text).includes(token)) score += 4;
  }

  if (intent.category) {
    const match = productMatchesCategory(product, intent.category);
    if (match === 'exact') score += 110;
    if (match === 'related') score += 42;
  }

  const searchedBrand = intent.vehicleBrand || intent.productBrand;
  if (searchedBrand) {
    const brandText = normalizeKey([brand, title, text].join(' '));
    if (brandText.includes(normalizeKey(searchedBrand))) score += 112;
  }

  if (intent.vehicleModel) {
    const modelText = normalizeKey([model, title, text].join(' '));
    if (modelText.includes(normalizeKey(intent.vehicleModel))) score += 78;
  }

  if (intent.productBrand && intent.category === 'Tires' && PREMIUM_TIRE_BRANDS.some((brandName) => normalizeKey(text).includes(normalizeKey(brandName)))) {
    score += normalizeKey(text).includes(normalizeKey(intent.productBrand)) ? 40 : 28;
  }

  if (!intent.vehicleBrand && profile?.vehicleContext?.brand) {
    const contextBrand = profile.vehicleContext.brand;
    if (normalizeKey(text).includes(normalizeKey(contextBrand))) score += 34;
  }

  if (!intent.vehicleModel && profile?.vehicleContext?.model) {
    const contextModel = profile.vehicleContext.model;
    if (normalizeKey(text).includes(normalizeKey(contextModel))) score += 28;
  }

  return score;
}

function calculateVehicleAffinity(product: Partial<Product>, profile: InterestProfile): number {
  let score = 0;
  const text = productText(product);
  const brand = product.brand || '';
  const model = product.model || '';

  score += getWeightScore(profile.vehicleBrandWeights, brand, 34);
  score += getWeightScore(profile.vehicleModelWeights, model, 30);

  const context = profile.vehicleContext;
  if (context?.brand && normalizeKey(text).includes(normalizeKey(context.brand))) {
    score += 25 * Math.min(1, context.confidence / 100);
  }
  if (context?.model && normalizeKey(text).includes(normalizeKey(context.model))) {
    score += 22 * Math.min(1, context.confidence / 100);
  }

  return score;
}

function calculateRecencyScore(product: Partial<Product>): number {
  if (!product.created_at) return 0;
  const createdAt = new Date(product.created_at).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  const ageDays = Math.max(0, (Date.now() - createdAt) / 86400000);
  return Math.max(0, 12 - ageDays / 12);
}

function getLatestIntentSearchTerm(profile?: InterestProfile | null): string | undefined {
  const latest = profile?.recentSearches?.[0];
  if (!latest?.raw) return undefined;

  const trackedAt = new Date(latest.at).getTime();
  if (Number.isFinite(trackedAt) && Date.now() - trackedAt > LATEST_INTENT_WINDOW_MS) {
    return undefined;
  }

  return latest.raw;
}

export function scoreProduct(product: Partial<Product>, options: {
  profile?: InterestProfile | null;
  searchTerm?: string;
  products?: Array<Partial<Product>>;
} = {}): ScoredProduct<Partial<Product>> {
  const profile = options.profile || makeEmptyProfile('temporary');
  const explicitSearchTerm = options.searchTerm?.trim() || '';
  const searchTerm = explicitSearchTerm || getLatestIntentSearchTerm(profile) || '';
  const intent = searchTerm ? inferSearchIntent(searchTerm, options.products) : undefined;
  const searchIntentMultiplier = explicitSearchTerm ? 1 : 0.82;
  const productId = getProductId(product, null);
  const category = getProductCategory(product);

  const breakdown: SmartScoreBreakdown = {
    searchRelevance: calculateSearchScore(product, intent, profile) * searchIntentMultiplier,
    brandAffinity: getWeightScore(profile.brandWeights, product.brand, 38),
    vehicleAffinity: calculateVehicleAffinity(product, profile),
    categoryAffinity: getWeightScore(profile.categoryWeights, category, 42),
    purchaseHistory: profile.purchasedProductIds.includes(productId) ? 18 : 0,
    dealScore: calculateDealScore(product),
    popularity: getWeightScore(profile.productWeights, productId, 35),
    stock: Number(product.stock ?? 0) > 0 ? 8 : -20,
    recency: calculateRecencyScore(product),
    total: 0,
  };

  breakdown.total =
    breakdown.searchRelevance +
    breakdown.brandAffinity +
    breakdown.vehicleAffinity +
    breakdown.categoryAffinity +
    breakdown.purchaseHistory +
    breakdown.dealScore +
    breakdown.popularity +
    breakdown.stock +
    breakdown.recency;

  return { product, score: breakdown.total, breakdown };
}

export function rankProducts<T extends Partial<Product>>(products: T[], options: {
  profile?: InterestProfile | null;
  searchTerm?: string;
  preserveWhenNoSignals?: boolean;
  priceDirection?: 'asc' | 'desc';
  newestFirst?: boolean;
} = {}): T[] {
  if (!Array.isArray(products) || products.length <= 1) return products || [];

  const profile = options.profile || null;
  const hasSignals = Boolean(
    options.searchTerm?.trim() ||
    (profile && (
      Object.keys(profile.brandWeights).length ||
      Object.keys(profile.categoryWeights).length ||
      Object.keys(profile.productWeights).length ||
      profile.vehicleContext
    ))
  );

  if (options.preserveWhenNoSignals && !hasSignals) return products;

  return products
    .map((product, index) => ({
      ...scoreProduct(product, { profile, searchTerm: options.searchTerm, products }),
      index,
    }))
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (Math.abs(scoreDelta) > 0.001) return scoreDelta;

      if (options.priceDirection) {
        const aPrice = Number(a.product.price || 0);
        const bPrice = Number(b.product.price || 0);
        return options.priceDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      }

      if (options.newestFirst) {
        const aTime = new Date(a.product.created_at || 0).getTime();
        const bTime = new Date(b.product.created_at || 0).getTime();
        if (aTime !== bTime) return bTime - aTime;
      }

      return a.index - b.index;
    })
    .map(({ product }) => product as T);
}

export function getRecommendedProducts(products: Product[], profile: InterestProfile, limit = 10): Product[] {
  return rankProducts(products, { profile, preserveWhenNoSignals: true })
    .filter((product) => Number(product.stock ?? 0) > 0)
    .slice(0, limit);
}

export function getPersonalizedDeals(products: Product[], profile: InterestProfile, limit = 10, searchTerm = ''): Product[] {
  return products
    .filter((product) => calculateDealScore(product) > 8)
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(product, { profile, searchTerm }).score + calculateDealScore(product) * 1.2,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ product }) => product);
}

export function getContinueShoppingProducts(products: Product[], profile: InterestProfile, limit = 10): Product[] {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const recent = profile.recentlyViewedProductIds
    .map((id) => byId.get(String(id)))
    .filter((product): product is Product => Boolean(product));
  const recentCategories = new Set(recent.map((product) => normalizeKey(product.category_name)));
  const categoryMatches = products.filter(
    (product) =>
      !profile.recentlyViewedProductIds.includes(String(product.id)) &&
      recentCategories.has(normalizeKey(product.category_name))
  );

  return [...recent, ...rankProducts(categoryMatches, { profile })].slice(0, limit);
}

export function getSimilarVehicleParts(products: Product[], currentProduct: Product, profile: InterestProfile, limit = 10): Product[] {
  const currentBrand = currentProduct.brand || profile.vehicleContext?.brand || '';
  const currentModel = currentProduct.model || profile.vehicleContext?.model || '';
  const currentCategory = getProductCategory(currentProduct);

  return products
    .filter((product) => product.id !== currentProduct.id)
    .map((product, index) => {
      const sameBrand = currentBrand && normalizeKey(productText(product)).includes(normalizeKey(currentBrand));
      const sameModel = currentModel && normalizeKey(productText(product)).includes(normalizeKey(currentModel));
      const differentCategory = normalizeKey(getProductCategory(product)) !== normalizeKey(currentCategory);
      const related = (RELATED_CATEGORIES[currentCategory] || []).some((category) => productMatchesCategory(product, category) !== 'none');
      const score =
        (sameBrand ? 70 : 0) +
        (sameModel ? 55 : 0) +
        (differentCategory ? 24 : 0) +
        (related ? 30 : 0) +
        scoreProduct(product, { profile }).score * 0.35;
      return { product, index, score };
    })
    .filter(({ score }) => score > 25)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ product }) => product);
}

export function getCompleteRepairProducts(products: Product[], currentProduct: Product, profile: InterestProfile, limit = 10): Product[] {
  const currentCategory = getProductCategory(currentProduct);
  const relatedCategories = RELATED_CATEGORIES[currentCategory] || [];
  const text = productText(currentProduct);

  return products
    .filter((product) => product.id !== currentProduct.id)
    .map((product, index) => {
      const relatedScore = relatedCategories.reduce((sum, category, relatedIndex) => {
        return sum + (productMatchesCategory(product, category) !== 'none' ? 60 - relatedIndex * 4 : 0);
      }, 0);
      const vehicleScore =
        currentProduct.brand && normalizeKey(productText(product)).includes(normalizeKey(currentProduct.brand)) ? 28 : 0;
      const titleTokenScore = tokenize(text).some((token) => normalizeKey(productText(product)).includes(token)) ? 8 : 0;
      return {
        product,
        index,
        score: relatedScore + vehicleScore + titleTokenScore + scoreProduct(product, { profile }).score * 0.2,
      };
    })
    .filter(({ score }) => score > 20)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ product }) => product);
}

export function getFrequentlyBoughtTogetherProducts(products: Product[], currentProduct: Product, profile: InterestProfile, limit = 6): Product[] {
  const knownIds = new Set([...profile.cartProductIds, ...profile.purchasedProductIds]);
  const currentCategory = getProductCategory(currentProduct);
  const relatedCategories = RELATED_CATEGORIES[currentCategory] || [];

  return products
    .filter((product) => product.id !== currentProduct.id)
    .map((product, index) => {
      const inKnownSet = knownIds.has(String(product.id)) ? 45 : 0;
      const categoryScore = relatedCategories.some((category) => productMatchesCategory(product, category) !== 'none') ? 48 : 0;
      const vehicleScore = currentProduct.brand && product.brand && normalizeKey(product.brand) === normalizeKey(currentProduct.brand) ? 24 : 0;
      return { product, index, score: inKnownSet + categoryScore + vehicleScore + calculateDealScore(product) * 0.4 };
    })
    .filter(({ score }) => score > 18)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ product }) => product);
}

function topEntries(weights: Record<string, number>, limit = 8) {
  return Object.entries(weights)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ label: titleize(key), weight: Math.round(value) }));
}

export function getRecommendationAnalytics(profile: InterestProfile, products: Product[] = []) {
  const recommended = getRecommendedProducts(products, profile, 10);
  const impressions = profile.eventCounts.recommendation_impression || 0;
  const clicks = profile.eventCounts.recommendation_click || 0;
  const conversions = profile.eventCounts.recommendation_conversion || profile.eventCounts.purchase || 0;

  return {
    mostViewedBrands: topEntries(profile.brandWeights),
    mostViewedCategories: topEntries(profile.categoryWeights),
    mostViewedVehicles: topEntries({
      ...profile.vehicleBrandWeights,
      ...profile.vehicleModelWeights,
    }),
    topRecommendedProducts: recommended.map((product) => ({
      id: product.id,
      title: product.title,
      score: Math.round(scoreProduct(product, { profile }).score),
    })),
    recommendationCtr: impressions > 0 ? clicks / impressions : 0,
    recommendationConversionRate: clicks > 0 ? conversions / clicks : 0,
    eventCounts: profile.eventCounts,
    vehicleContext: profile.vehicleContext,
  };
}
