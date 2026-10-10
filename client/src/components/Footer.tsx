import { Link } from "wouter";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { SEO_CONFIG } from "@/lib/seoConfig";
import { openConsentSettings } from "@/lib/cookieConsent";
import { VEHICLES } from "@shared/vehicleContent";
import {
  SITE_LANGUAGE_CHANGED_EVENT,
  getSiteLanguage,
  translateText,
  type SiteLanguageCode,
} from "@/lib/language";

const socialLinks = Object.entries(SEO_CONFIG.contact.social).filter(
  ([, href]) => Boolean(href)
);

export default function Footer() {
  const [language, setLanguage] = useState<SiteLanguageCode>(() =>
    getSiteLanguage()
  );
  const t = (key: string, fallback: string) =>
    translateText(language, key, fallback);

  useEffect(() => {
    const syncFromStorage = () => {
      const storedLanguage = getSiteLanguage();
      if (storedLanguage !== language) {
        setLanguage(storedLanguage);
      }
    };

    syncFromStorage();
    const timer = window.setTimeout(syncFromStorage, 800);

    const onLanguageChanged = () => {
      const next = getSiteLanguage();
      if (next === language) return;
      setLanguage(next);
    };
    const onStorageLanguageChanged = (event: StorageEvent) => {
      if (event.key !== "site-language") return;
      onLanguageChanged();
    };
    window.addEventListener(
      SITE_LANGUAGE_CHANGED_EVENT,
      onLanguageChanged as EventListener
    );
    window.addEventListener("storage", onStorageLanguageChanged);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        SITE_LANGUAGE_CHANGED_EVENT,
        onLanguageChanged as EventListener
      );
      window.removeEventListener("storage", onStorageLanguageChanged);
    };
  }, [language]);

  return (
    <footer className="w-full overflow-x-hidden bg-gray-950 text-white">
      <div className="container py-10 sm:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-x-10">
          {/* About */}
          <div className="col-span-2 md:col-span-1">
            <BrandLogo
              variant="dark"
              className="mb-4 h-10 w-auto max-w-[200px]"
            />
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              {t(
                "footer.about",
                "Auto parts and accessories for trucks, Jeeps, Teslas and European cars. Every listing states the model years it fits, with support before and after you order."
              )}
            </p>
          </div>

          {/* Browse */}
          <div>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {t("footer.browse", "Browse")}
            </h2>
            <ul className="text-sm text-gray-400">
              <li>
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.allProducts", "All Products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/vin-decoder"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  VIN Decoder
                </Link>
              </li>
              <li>
                <Link
                  href="/site-map"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.siteMap", "HTML Sitemap")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {t("footer.support", "Support")}
            </h2>
            <ul className="text-sm text-gray-400">
              <li>
                <Link
                  href="/help"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.helpCenter", "Help Center")}
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.faq", "FAQ")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.contactUs", "Contact Us")}
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.shippingInfo", "Shipping Info")}
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.returns", "Returns")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {t("footer.legal", "Legal")}
            </h2>
            <ul className="text-sm text-gray-400">
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.privacyPolicy", "Privacy Policy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.termsOfService", "Terms of Service")}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.cookiePolicy", "Cookie Policy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/accessibility"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {t("footer.accessibility", "Accessibility")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Shop by vehicle */}
        <nav aria-label="Shop by vehicle" className="mt-10">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Shop by vehicle
          </h2>
          <ul className="flex flex-wrap gap-x-5 text-sm text-gray-400">
            {VEHICLES.map(vehicle => (
              <li key={vehicle.slug}>
                <Link
                  href={`/vehicle/${vehicle.slug}`}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-9"
                >
                  {vehicle.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="mb-6 mt-10 border-t border-white/10" />

        {/* Bottom */}
        <div className="flex flex-col items-start justify-between gap-4 text-xs text-gray-400 sm:flex-row sm:items-center">
          <p>
            &copy; 2026 MotorVault.{" "}
            {t("footer.allRightsReserved", "All rights reserved.")}{" "}
            <button
              type="button"
              onClick={openConsentSettings}
              className="ml-2 underline underline-offset-2 transition-colors hover:text-white"
            >
              {t("footer.cookieSettings", "Cookie settings")}
            </button>
          </p>
          {/* Only profiles with a real destination are shown */}
          {socialLinks.length > 0 && (
            <div className="flex gap-5">
              {socialLinks.map(([network, href]) => (
                <a
                  key={network}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="capitalize transition-colors hover:text-white"
                >
                  {network}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
