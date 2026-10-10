/**
 * Cookie consent for non-essential (marketing and analytics) technologies.
 *
 * The only such technology the site loads itself is the Meta pixel
 * (client/index.html). Its script is not downloaded until
 * `window.__mvMarketingConsent` is true, so nothing is sent to Meta before
 * the visitor's choice is known. Events fired in the meantime wait in the fbq
 * queue and are sent if consent is given.
 *
 * Visitors in the EEA, the UK and Switzerland must opt in. Elsewhere the
 * pixel runs unless the visitor declines. An unknown location is treated as
 * opt-in.
 */

export const CONSENT_STORAGE_KEY = "mv_cookie_consent";
export const CONSENT_CHANGED_EVENT = "mv:cookie-consent-changed";
export const CONSENT_OPEN_EVENT = "mv:cookie-consent-open";

export type StoredConsent = {
  marketing: boolean;
  decidedAt: string;
};

/** EEA member states, the UK and Switzerland. */
const OPT_IN_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
]);

export function requiresOptIn(countryCode: string | null | undefined): boolean {
  const code = String(countryCode || "")
    .trim()
    .toUpperCase();
  if (!code) return true;
  return OPT_IN_COUNTRIES.has(code);
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.marketing !== "boolean") return null;
    return {
      marketing: parsed.marketing,
      decidedAt: String(parsed.decidedAt || ""),
    };
  } catch {
    return null;
  }
}

/**
 * Whether marketing technologies may run: the visitor's stored choice, or
 * the default for their region when they have not chosen yet.
 */
export function isMarketingAllowed(
  stored: StoredConsent | null,
  countryCode: string | null | undefined
): boolean {
  if (stored) return stored.marketing;
  return !requiresOptIn(countryCode);
}

/** Tells the pixel loader in index.html whether it may download the script. */
export function applyMarketingConsent(allowed: boolean): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.__mvMarketingConsent = allowed;
  if (allowed && typeof w.__resumeMetaPixel === "function") {
    w.__resumeMetaPixel();
  }
}

export function saveConsent(marketing: boolean): StoredConsent {
  const consent: StoredConsent = {
    marketing,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page.
  }
  applyMarketingConsent(marketing);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
  return consent;
}

/** Reopens the banner, for the footer's "Cookie settings" link. */
export function openConsentSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}
