import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getCountryCode } from "@/lib/currencyClient";
import {
  CONSENT_OPEN_EVENT,
  applyMarketingConsent,
  isMarketingAllowed,
  readStoredConsent,
  saveConsent,
} from "@/lib/cookieConsent";

/**
 * Cookie banner. Shown until the visitor accepts or declines non-essential
 * cookies, and again from the footer's "Cookie settings" link.
 *
 * Renders nothing on the server and on the first client render: the choice
 * lives in localStorage, which the server cannot see.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    setVisible(!stored);

    // The visitor's country arrives asynchronously on a first visit. Apply
    // the regional default now and again once it is known; a stored choice
    // always wins.
    const applyDefault = () => {
      applyMarketingConsent(
        isMarketingAllowed(readStoredConsent(), getCountryCode())
      );
    };
    applyDefault();
    const timers = [1500, 4000, 8000].map(delay =>
      window.setTimeout(applyDefault, delay)
    );

    // Fired by currencyClient when the visitor's location has loaded.
    window.addEventListener("currency-client-updated", applyDefault);

    const open = () => setVisible(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener("currency-client-updated", applyDefault);
      window.removeEventListener(CONSENT_OPEN_EVENT, open);
    };
  }, []);

  if (!visible) return null;

  const choose = (marketing: boolean) => {
    saveConsent(marketing);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-text"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="max-w-3xl">
          {/* Kept short and small on purpose: the banner appears after the
              page has loaded, and a large block of late text was being
              measured as the page's largest paint. */}
          <p
            id="cookie-consent-text"
            className="text-[13px] leading-snug text-gray-600"
          >
            <span id="cookie-consent-title" className="font-semibold text-ink">
              Cookies.
            </span>{" "}
            We use cookies to run the store and improve your experience.{" "}
            <Link href="/cookies" className="underline underline-offset-2">
              Cookie policy
            </Link>
          </p>
        </div>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-gray-50 sm:flex-none"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="min-h-11 flex-1 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 sm:flex-none"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
