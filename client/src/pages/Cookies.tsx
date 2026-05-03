export default function Cookies() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: April 30, 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-600">Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to remember your preferences, understand how you use our site, and improve your experience.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-gray-600 mb-4">ModernMart uses cookies for the following purposes:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>Authentication:</strong> To keep you logged in and secure</li>
              <li><strong>Preferences:</strong> To remember your settings and choices</li>
              <li><strong>Analytics:</strong> To understand how you use our site (with your consent)</li>
              <li><strong>Shopping:</strong> To maintain your shopping cart and order information</li>
              <li><strong>Security:</strong> To prevent fraud and protect your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies</h2>
            <h3 className="text-lg font-semibold mb-2">Essential Cookies</h3>
            <p className="text-gray-600 mb-4">These cookies are necessary for the website to function properly and cannot be disabled. They include authentication and security cookies.</p>
            
            <h3 className="text-lg font-semibold mb-2">Performance Cookies</h3>
            <p className="text-gray-600 mb-4">These cookies help us understand how visitors use the website and identify areas for improvement.</p>
            
            <h3 className="text-lg font-semibold mb-2">Preference Cookies</h3>
            <p className="text-gray-600">These cookies remember your choices and preferences to provide a personalized experience.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-gray-600 mb-4">You can control cookie preferences through your browser settings. Most browsers allow you to refuse cookies or alert you when cookies are being sent. Please note that disabling cookies may affect the functionality of our website.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Cookies</h2>
            <p className="text-gray-600">Our website may include content from third parties (e.g., payment processors, analytics services) that may set their own cookies. Our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> governs how we handle third-party data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p className="text-gray-600">We may update this Cookie Policy from time to time. Continued use of our website indicates your acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about our use of cookies, please <a href="/contact" className="text-blue-600 hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
