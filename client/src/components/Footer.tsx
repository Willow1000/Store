import { Link } from 'wouter';

const t = (_key: string, fallback: string) => fallback;

export default function Footer() {
  return (
    <footer className="border-t border-border bg-black text-white w-full overflow-x-hidden">
      <div className="w-full px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 mx-auto max-w-full lg:max-w-7xl lg:mx-auto">
        <div className="grid gap-6 sm:gap-8 grid-cols-2 md:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold">ModernMart</h3>
            <p className="text-xs sm:text-sm text-gray-400">
              {t('footer.about', 'Your trusted marketplace for quality products and seamless shopping experience.')}
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.browse', 'Browse')}</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/products">
                  <a className="hover:text-white">{t('footer.allProducts', 'All Products')}</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.support', 'Support')}</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/help">
                  <a className="hover:text-white transition-colors">{t('footer.helpCenter', 'Help Center')}</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-white transition-colors">{t('footer.contactUs', 'Contact Us')}</a>
                </Link>
              </li>
              <li>
                <Link href="/shipping">
                  <a className="hover:text-white transition-colors">{t('footer.shippingInfo', 'Shipping Info')}</a>
                </Link>
              </li>
              <li>
                <Link href="/returns">
                  <a className="hover:text-white transition-colors">{t('footer.returns', 'Returns')}</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 sm:mb-4 font-semibold text-sm sm:text-base">{t('footer.legal', 'Legal')}</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/privacy">
                  <a className="hover:text-white transition-colors">{t('footer.privacyPolicy', 'Privacy Policy')}</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="hover:text-white transition-colors">{t('footer.termsOfService', 'Terms of Service')}</a>
                </Link>
              </li>
              <li>
                <Link href="/cookies">
                  <a className="hover:text-white transition-colors">{t('footer.cookiePolicy', 'Cookie Policy')}</a>
                </Link>
              </li>
              <li>
                <Link href="/accessibility">
                  <a className="hover:text-white transition-colors">{t('footer.accessibility', 'Accessibility')}</a>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 sm:my-8 border-t border-gray-800" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 text-xs sm:text-sm text-gray-400 md:flex-row">
          <p>&copy; 2026 ModernMart. {t('footer.allRightsReserved', 'All rights reserved.')} </p>
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
