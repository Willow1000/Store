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
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: April 30, 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-gray-600 mb-4">This Privacy Policy explains how MotorVault collects, uses, discloses, stores, and safeguards personal information when you access our website, create an account, complete a transaction, contact support, or otherwise interact with our services. We take a measured, security-conscious approach to data stewardship and strive to process information only to the extent necessary for legitimate business and operational purposes.</p>
            <p className="text-gray-600">By using our services, you acknowledge that your information may be processed in accordance with this Policy and any jurisdiction-specific privacy obligations applicable to our operations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600">MotorVault ("we," "us," or "our") operates the motorvault.com website. This Policy outlines the categories of personal data we may collect, the purposes for which it is processed, the safeguards we employ, and the choices available to you regarding your information.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Categories of Information We Collect</h2>
            <p className="text-gray-600 mb-4">We may collect information directly from you, automatically through your use of the website, or from third-party service providers where permitted by law. The exact categories may vary depending on how you interact with us.</p>
            
            <h3 className="text-lg font-semibold mb-2">Types of Data Collected:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Identity and contact information such as name, email address, telephone number, and account credentials.</li>
              <li>Transaction-related information such as shipping details, billing addresses, order history, and communication records.</li>
              <li>Payment data processed through secure third-party payment providers; we do not store full card details on our own systems where avoidable.</li>
              <li>Device, browser, and interaction data, including pages visited, session duration, referral source, and general usage patterns.</li>
              <li>Customer support data, including messages, attachments, and information provided to resolve inquiries or disputes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Information</h2>
            <p className="text-gray-600 mb-4">We use personal data to operate, maintain, secure, and improve the services, and to fulfill our contractual and legal obligations. Where required, we rely on your consent, contractual necessity, legitimate interests, or compliance obligations as the legal basis for processing.</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Processing orders, payments, returns, and shipping arrangements.</li>
              <li>Maintaining user accounts, preferences, and saved shopping data.</li>
              <li>Responding to inquiries, complaints, and customer service requests.</li>
              <li>Analyzing usage trends to improve product discovery, performance, and site reliability.</li>
              <li>Detecting, preventing, and investigating fraud, abuse, and unauthorized activity.</li>
              <li>Sending marketing communications where legally permitted and where you have not opted out.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Disclosure and Sharing</h2>
            <p className="text-gray-600 mb-4">We do not sell personal information in the ordinary sense of that term. We may disclose limited information where necessary to operate the business or where otherwise permitted or required by law.</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Service providers that assist with hosting, analytics, payment processing, fulfillment, communications, or support operations.</li>
              <li>Professional advisers, auditors, insurers, or legal authorities where disclosure is reasonably necessary.</li>
              <li>Business transferees in connection with a merger, acquisition, restructuring, or similar corporate transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Security of Data</h2>
            <p className="text-gray-600 mb-4">The protection of personal information is important to us. We implement administrative, technical, and organizational safeguards designed to reduce the risk of unauthorized access, alteration, disclosure, or destruction. These measures may include access controls, encryption in transit where applicable, and operational monitoring.</p>
            <p className="text-gray-600">No internet-based system can be guaranteed to be completely secure, and you acknowledge that any transmission of information over the internet carries inherent risk.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">We retain personal information for as long as reasonably necessary to fulfill the purposes for which it was collected, to resolve disputes, to enforce agreements, and to comply with legal or accounting obligations. Retention periods vary depending on the nature of the data, the sensitivity of the information, and the applicable legal requirements.</p>
            <p className="text-gray-600">Where data is no longer required, we take commercially reasonable steps to delete, de-identify, or securely archive it in accordance with our internal retention practices.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. International Transfers</h2>
            <p className="text-gray-600">Because we operate across multiple regions and may rely on service providers in different jurisdictions, your data may be transferred to and processed in countries other than your own. Where required, we use appropriate contractual, technical, or organizational measures to support lawful transfers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights and Choices</h2>
            <p className="text-gray-600 mb-4">Depending on your location, you may have rights to access, correct, delete, restrict, or object to certain processing activities, as well as the right to withdraw consent where processing is based on consent. You may also have the right to request a copy of your data in a portable format where required by law.</p>
            <p className="text-gray-600">You can also manage certain preferences directly through your browser, device settings, account controls, or by contacting us using the information below.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-gray-600">Our services are not directed to children, and we do not knowingly collect personal information from individuals below the age required by applicable law to consent to data processing. If you believe a child has provided personal information to us, please contact us so we may address the matter promptly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-600">We may update this Privacy Policy from time to time to reflect operational, legal, or regulatory developments. The revised version will be posted on this page with an updated effective date. We encourage you to review this Policy periodically so you remain informed about our privacy practices.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Cookies and Similar Technologies</h2>
            <p className="text-gray-600 mb-4">We and our service providers may use cookies, pixels, local storage, and comparable technologies to preserve login state, remember preferences, measure website performance, support analytics, and improve the user experience. Some of these technologies are strictly necessary, while others are optional and subject to consent controls where required.</p>
            <p className="text-gray-600">You may control cookies through your browser or device settings, though disabling certain technologies may affect the functionality of account, cart, or checkout features.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Legal Bases for Processing</h2>
            <p className="text-gray-600 mb-4">Where a legal basis is required for processing, we may rely on contract necessity, legitimate interests, consent, compliance with legal obligations, or the establishment, exercise, or defense of legal claims. The applicable basis depends on the specific processing activity and the relevant jurisdiction.</p>
            <p className="text-gray-600">Where we rely on legitimate interests, we seek to balance our operational needs against your privacy rights and implement safeguards designed to minimize unnecessary intrusion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Data Subject Requests</h2>
            <p className="text-gray-600 mb-4">Subject to applicable law, you may have the right to access, correct, delete, restrict, or object to certain processing of your personal information, and in some cases request portability of your data. We may need to verify your identity before fulfilling a request and may refuse or limit requests where an exemption applies.</p>
            <p className="text-gray-600">Requests involving complex records, cross-border processing, or legal retention obligations may require additional review time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Data Retention and Deletion</h2>
            <p className="text-gray-600">We retain personal information for only as long as reasonably necessary to fulfill the purposes described in this Policy, comply with legal obligations, resolve disputes, prevent fraud, and maintain business records. Once retention is no longer necessary, we may delete, anonymize, or archive data using commercially reasonable methods.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy or our data practices, please <a href="/contact" className="text-blue-600 hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
