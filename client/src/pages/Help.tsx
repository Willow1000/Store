import { SEOHead } from '@/components/SEOHead';

export default function Help() {
  return (
    <>
      <SEOHead
        title="Help Center - MotorVault Support"
        description="Get help with MotorVault. Learn about creating accounts, searching products, payments, orders, and more."
        keywords={['help center', 'support', 'FAQ', 'customer support', 'how to']}
        canonical="https://motorvault.com/help"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Help Center</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <p className="text-gray-600 mb-4">Welcome to MotorVault! Here you'll find answers to common questions about shopping, account management, and more.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">How do I create an account?</h3>
            <p className="text-gray-600">Click the login button in the header and follow the authentication process using your preferred method (Google, GitHub, Apple, or Microsoft).</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">How do I search for products?</h3>
            <p className="text-gray-600">Use the search functionality on the Products page or navigate directly to the URL with a search query parameter.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">How do I view my orders?</h3>
            <p className="text-gray-600">Once logged in, visit your Account page to view order history and track order status.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">What payment methods are accepted?</h3>
            <p className="text-gray-600">We accept all major credit cards, PayPal, and region-specific payment methods through Stripe and Paystack integration.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">Contact Support</h3>
            <p className="text-gray-600">For additional help, please visit our <a href="/contact" className="text-blue-600 hover:underline">Contact Us</a> page.</p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
