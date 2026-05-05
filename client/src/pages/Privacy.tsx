import { SEOHead } from '@/components/SEOHead';

export default function Privacy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy - MotorVault"
        description="MotorVault Privacy Policy. Learn how we collect, use, and protect your personal data. Your privacy is important to us."
        keywords={['privacy policy', 'data protection', 'personal information', 'privacy']}
        canonical="https://motorvault.com/privacy"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: April 30, 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600">MotorVault ("we," "us," or "our") operates the motorvault.com website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information Collection and Use</h2>
            <p className="text-gray-600 mb-4">We collect several different types of information for various purposes to provide and improve our Service to you.</p>
            
            <h3 className="text-lg font-semibold mb-2">Types of Data Collected:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Personal data including email, name, and password during registration</li>
              <li>Payment information processed securely through Stripe and Paystack</li>
              <li>Shipping and billing addresses</li>
              <li>Usage data including pages visited, time spent, and interactions</li>
              <li>Device information and browser type</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Use of Data</h2>
            <p className="text-gray-600">We use the collected data for various purposes including:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Providing and maintaining our Service</li>
              <li>Processing your transactions</li>
              <li>Sending promotional emails and marketing communications</li>
              <li>Monitoring and analyzing trends and usage</li>
              <li>Detecting and preventing fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Security of Data</h2>
            <p className="text-gray-600">The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure. We use industry-standard encryption and security practices.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Changes to This Privacy Policy</h2>
            <p className="text-gray-600">We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy, please <a href="/contact" className="text-blue-600 hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
