import { SEOHead } from '@/components/SEOHead';

export default function Cookies() {
  return (
    <>
      <SEOHead
        title="Cookie Policy - MotorVault"
        description="MotorVault Cookie Policy. Information about how we use cookies and similar technologies on our website."
        keywords={['cookie policy', 'cookies', 'tracking', 'web analytics']}
        canonical="https://motorvault.com/cookies"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: April 30, 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Purpose of This Policy</h2>
            <p className="text-gray-600 mb-4">This Cookie Policy explains how MotorVault uses cookies and similar technologies to operate the website, preserve essential functionality, analyze performance, remember your preferences, and deliver a more coherent shopping experience.</p>
            <p className="text-gray-600">For the purposes of this Policy, the term "cookies" includes comparable technologies such as local storage, pixels, SDKs, and tracking identifiers that serve a similar technical function.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-600">Cookies are small data files stored on your device when you visit a website. They help websites recognize your browser, retain settings, and distinguish a repeat visitor from a first-time visitor. Cookies may be session-based and deleted when you close your browser, or persistent and stored for a defined period of time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-gray-600 mb-4">MotorVault uses cookies and similar technologies for the following operational and analytical purposes:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>Authentication:</strong> To keep you signed in, maintain secure sessions, and reduce repeated login prompts.</li>
              <li><strong>Preferences:</strong> To remember language, region, wishlist, and display settings.</li>
              <li><strong>Shopping and Checkout:</strong> To preserve cart contents, checkout state, and order-related interactions.</li>
              <li><strong>Analytics:</strong> To understand how visitors navigate the site, identify content that performs well, and improve page experience.</li>
              <li><strong>Security:</strong> To detect fraudulent activity, abuse, and suspicious session behavior.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies</h2>
            <h3 className="text-lg font-semibold mb-2">Essential Cookies</h3>
            <p className="text-gray-600 mb-4">These cookies are necessary for the website to function properly and cannot be disabled through our cookie controls. They are typically used for login state, session continuity, security safeguards, and core navigation behavior.</p>
            
            <h3 className="text-lg font-semibold mb-2">Performance Cookies</h3>
            <p className="text-gray-600 mb-4">These cookies help us understand how visitors use the website, which pages are most frequently viewed, and where friction may occur. The insights gathered are aggregated or pseudonymous where possible.</p>
            
            <h3 className="text-lg font-semibold mb-2">Preference Cookies</h3>
            <p className="text-gray-600">These cookies remember your choices and preferences to provide a more personalized experience across future visits.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-gray-600 mb-4">You can control cookies through your browser settings and, where available, through in-site consent tools. Most browsers allow you to block, delete, or receive alerts before cookies are stored. Please note that disabling essential cookies may impair login, cart, or checkout functionality.</p>
            <p className="text-gray-600">If you clear cookies or use a different device or browser, certain preferences may need to be re-established.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Cookies</h2>
            <p className="text-gray-600 mb-4">Our website may include content or integrations from third parties, including payment processors, analytics tools, embedded services, or authentication providers, that may set their own cookies subject to their respective policies and controls.</p>
            <p className="text-gray-600">We recommend reviewing the relevant third-party privacy or cookie notices to understand how those providers collect and use information. Our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> describes our handling of related data in more detail.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p className="text-gray-600">We may update this Cookie Policy from time to time to reflect technical changes, legal obligations, or changes in the way we use cookies. Any revisions will be posted on this page with a new effective date, and your continued use of the website after such changes indicates your acceptance of the updated Policy where permitted by law.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Consent and Regional Controls</h2>
            <p className="text-gray-600 mb-4">Where consent is required for non-essential cookies, we may present preference controls that allow you to accept, reject, or manage specific categories. The availability of these controls may vary by jurisdiction, device, browser, or local regulatory requirements.</p>
            <p className="text-gray-600">If you withdraw consent, we will stop placing non-essential cookies going forward, though previously stored cookies may remain on your device until removed through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Retention and Expiration</h2>
            <p className="text-gray-600 mb-4">Cookies are retained for different durations depending on their purpose. Session cookies generally expire when you close your browser, while persistent cookies may remain active for a defined period unless deleted by you. We periodically review cookie retention to ensure that it remains proportionate to the function served.</p>
            <p className="text-gray-600">Third-party cookies may be governed by the retention schedules and expiration settings of the relevant provider rather than by MotorVault directly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Policy Administration</h2>
            <p className="text-gray-600">We may add, remove, or modify cookie categories to reflect operational, technical, security, or legal requirements. When material changes occur, we will update this Policy and, where appropriate, refresh our consent tools or preference settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about our use of cookies or similar technologies, please <a href="/contact" className="text-blue-600 hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
