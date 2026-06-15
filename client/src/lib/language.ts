export type SiteLanguageCode = 'de' | 'en' | 'it' | 'fr' | 'es' | 'nl';
export type SiteLanguageSource = 'auto' | 'manual';

type GeoLike = {
  location?: {
    country_code2?: string;
    state_prov?: string;
  };
  country_metadata?: {
    languages?: string[];
  };
};

export const SUPPORTED_SITE_LANGUAGES: Array<{
  code: SiteLanguageCode;
  name: string;
  nativeName: string;
}> = [
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
];

const SITE_LANGUAGE_KEY = 'site-language';
const SITE_LANGUAGE_SOURCE_KEY = 'site-language-source';
export const SITE_LANGUAGE_CHANGED_EVENT = 'site-language-changed';

const ENGLISH_OVERRIDE_COUNTRIES = new Set<string>([
  'US',
  'CA',
  // Africa
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CD', 'DJ', 'EG', 'GQ', 'ER',
  'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'CI', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR',
  'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'CG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
  'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
]);

const KEY_TRANSLATIONS: Record<SiteLanguageCode, Record<string, string>> = {
  de: {
    'header.products': 'Produkte',
    'header.about': 'Über uns',
    'header.contact': 'Kontakt',
    'common.cart': 'Warenkorb',
    'checkout.subtotal': 'Zwischensumme',
    'checkout.shipping': 'Versand',
    'checkout.vat': 'MwSt',
    'checkout.total': 'Gesamtsumme',
    'checkout.free': 'KOSTENLOS',
    'checkout.orderSummary': 'Bestellübersicht',
    'checkout.proceedToCheckout': 'Zur Kasse',
    'loading.selectedLanguage': 'Ausgewaehlte Sprache wird geladen...',
  },
  en: {
    'loading.selectedLanguage': 'Loading selected language...',
  },
  it: {
    'header.products': 'Prodotti',
    'header.about': 'Chi siamo',
    'header.contact': 'Contatti',
    'common.cart': 'Carrello',
    'checkout.subtotal': 'Subtotale',
    'checkout.shipping': 'Spedizione',
    'checkout.vat': 'IVA',
    'checkout.total': 'Totale',
    'checkout.free': 'GRATIS',
    'checkout.orderSummary': 'Riepilogo ordine',
    'checkout.proceedToCheckout': 'Vai al pagamento',
    'loading.selectedLanguage': 'Caricamento della lingua selezionata...',
  },
  fr: {
    'header.products': 'Produits',
    'header.about': 'À propos',
    'header.contact': 'Contact',
    'common.cart': 'Panier',
    'checkout.subtotal': 'Sous-total',
    'checkout.shipping': 'Livraison',
    'checkout.vat': 'TVA',
    'checkout.total': 'Total',
    'checkout.free': 'GRATUIT',
    'checkout.orderSummary': 'Récapitulatif',
    'checkout.proceedToCheckout': 'Passer au paiement',
    'loading.selectedLanguage': 'Chargement de la langue selectionnee...',
  },
  es: {
    'header.products': 'Productos',
    'header.about': 'Acerca de',
    'header.contact': 'Contacto',
    'common.cart': 'Carrito',
    'checkout.subtotal': 'Subtotal',
    'checkout.shipping': 'Envío',
    'checkout.vat': 'IVA',
    'checkout.total': 'Total',
    'checkout.free': 'GRATIS',
    'checkout.orderSummary': 'Resumen del pedido',
    'checkout.proceedToCheckout': 'Ir al pago',
    'loading.selectedLanguage': 'Cargando el idioma seleccionado...',
  },
  nl: {
    'header.products': 'Producten',
    'header.about': 'Over ons',
    'header.contact': 'Contact',
    'common.cart': 'Winkelwagen',
    'checkout.subtotal': 'Subtotaal',
    'checkout.shipping': 'Verzending',
    'checkout.vat': 'BTW',
    'checkout.total': 'Totaal',
    'checkout.free': 'GRATIS',
    'checkout.orderSummary': 'Besteloverzicht',
    'checkout.proceedToCheckout': 'Afrekenen',
    'loading.selectedLanguage': 'Geselecteerde taal wordt geladen...',
  },
};

function isSupportedLanguage(value: string): value is SiteLanguageCode {
  return SUPPORTED_SITE_LANGUAGES.some((lang) => lang.code === value);
}

function normalizeLanguageCode(value: string | null | undefined): SiteLanguageCode | null {
  if (!value) return null;
  const short = value.toLowerCase().split('-')[0];
  return isSupportedLanguage(short) ? short : null;
}

function detectFromRegion(countryCode: string, stateProvince: string): SiteLanguageCode {
  const country = countryCode.toUpperCase();
  const state = stateProvince.toLowerCase();

  if (ENGLISH_OVERRIDE_COUNTRIES.has(country)) return 'en';

  if (country === 'DE' || country === 'AT') return 'de';
  if (country === 'GB' || country === 'IE' || country === 'SE' || country === 'NO' || country === 'DK' || country === 'FI' || country === 'MT') return 'en';
  if (country === 'IT' || country === 'SI' || country === 'HR') return 'it';
  if (country === 'FR') return 'fr';
  if (country === 'ES' || country === 'AD') return 'es';
  if (country === 'NL') return 'nl';

  if (country === 'BE') {
    if (state.includes('flanders') || state.includes('vlaanderen') || state.includes('antwerp') || state.includes('ghent') || state.includes('bruges')) {
      return 'nl';
    }
    if (state.includes('wallonia') || state.includes('wallon') || state.includes('liege') || state.includes('charleroi') || state.includes('namur')) {
      return 'fr';
    }
    return 'de';
  }

  if (country === 'CH') {
    if (state.includes('ticino') || state.includes('lugano') || state.includes('locarno')) return 'it';
    if (state.includes('geneva') || state.includes('vaud') || state.includes('lausanne') || state.includes('neuchatel') || state.includes('jura')) return 'fr';
    return 'de';
  }

  if (country === 'LU') {
    return 'de';
  }

  return 'en';
}

export function detectLanguageFromGeo(geo: GeoLike | null | undefined): SiteLanguageCode {
  const country = geo?.location?.country_code2 || '';
  const state = geo?.location?.state_prov || '';
  if (country) {
    return detectFromRegion(country, state);
  }

  const hintedLanguage = normalizeLanguageCode(geo?.country_metadata?.languages?.[0]);
  if (hintedLanguage) return hintedLanguage;

  return 'en';
}

export function getSiteLanguage(): SiteLanguageCode {
  try {
    const stored = localStorage.getItem(SITE_LANGUAGE_KEY);
    const normalized = normalizeLanguageCode(stored);
    if (normalized) return normalized;
  } catch {
    // Ignore storage issues.
  }
  return 'en';
}

export function getSiteLanguageSource(): SiteLanguageSource {
  try {
    const raw = localStorage.getItem(SITE_LANGUAGE_SOURCE_KEY);
    return raw === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

export function getSiteLanguageDebugInfo(geo: GeoLike | null | undefined): {
  country: string;
  detectedLanguage: SiteLanguageCode;
  currentLanguage: SiteLanguageCode;
  source: SiteLanguageSource;
} {
  const country = (geo?.location?.country_code2 || '').toUpperCase();
  const detectedLanguage = detectLanguageFromGeo(geo);
  const currentLanguage = getSiteLanguage();
  const source = getSiteLanguageSource();

  return {
    country,
    detectedLanguage,
    currentLanguage,
    source,
  };
}

export function setSiteLanguage(language: SiteLanguageCode, source: SiteLanguageSource = 'manual'): void {
  try {
    localStorage.setItem(SITE_LANGUAGE_KEY, language);
    localStorage.setItem(SITE_LANGUAGE_SOURCE_KEY, source);
    window.dispatchEvent(new CustomEvent(SITE_LANGUAGE_CHANGED_EVENT, { detail: language }));
  } catch {
    // Ignore storage issues.
  }
}

export function initializeSiteLanguage(geo: GeoLike | null | undefined): SiteLanguageCode {
  const existing = getSiteLanguage();
  const source = getSiteLanguageSource();
  if (source === 'manual') return existing;

  const detected = detectLanguageFromGeo(geo);
  if (existing !== detected || source !== 'auto') {
    setSiteLanguage(detected, 'auto');
  }
  return detected;
}

export function translateText(language: SiteLanguageCode, key: string, fallback: string): string {
  return KEY_TRANSLATIONS[language]?.[key] || fallback;
}
