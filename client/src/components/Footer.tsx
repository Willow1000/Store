import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { SITE_LANGUAGE_CHANGED_EVENT, getSiteLanguage, translateText, type SiteLanguageCode } from '@/lib/language';

export default function Footer() {
  const [language, setLanguage] = useState<SiteLanguageCode>(() => getSiteLanguage());
  const t = (key: string, fallback: string) => translateText(language, key, fallback);

  useEffect(() => {
    const onLanguageChanged = () => setLanguage(getSiteLanguage());
    window.addEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
    window.addEventListener('storage', onLanguageChanged);

    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
      window.removeEventListener('storage', onLanguageChanged);
    };
  }, []);

  return (
    <footer className="border-t border-border bg-black text-white w-full overflow-x-hidden">
      <div className="w-full px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 mx-auto max-w-full lg:max-w-screen-xl lg:mx-auto">
        <div className="grid gap-6 sm:gap-8 grid-cols-2 md:grid-cols-4">
          {/* About */}
          <div>
            <BrandLogo variant="dark" className="mb-3 sm:mb-4 h-10 sm:h-12 w-auto max-w-[220px]" />
            <p className="text-xs sm:text-sm text-gray-400">
              {t('footer.about', 'Your ultimate destination for premium automotive and motor parts. Fast shipping, authentic products, and expert support for all your vehicle needs.')}
            </p>
          </div>

          {/* Browse */}
          <div>
            <h2 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.browse', 'Browse')}</h2>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/products" className="hover:text-white inline-flex min-h-11 items-center">{t('footer.allProducts', 'All Products')}</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h2 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.support', 'Support')}</h2>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/help" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.helpCenter', 'Help Center')}</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.faq', 'FAQ')}</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.contactUs', 'Contact Us')}</Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.shippingInfo', 'Shipping Info')}</Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.returns', 'Returns')}</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.legal', 'Legal')}</h2>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.privacyPolicy', 'Privacy Policy')}</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.termsOfService', 'Terms of Service')}</Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.cookiePolicy', 'Cookie Policy')}</Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-white transition-colors inline-flex min-h-11 items-center">{t('footer.accessibility', 'Accessibility')}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 sm:my-8 border-t border-gray-800" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 text-xs sm:text-sm text-gray-400 md:flex-row">
          <p>&copy; 2026 MotorVault. {t('footer.allRightsReserved', 'All rights reserved.')} </p>
          <div className="flex gap-4 sm:gap-6">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
