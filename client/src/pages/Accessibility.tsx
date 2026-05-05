import { SEOHead } from '@/components/SEOHead';

export default function Accessibility() {
  return (
    <>
      <SEOHead
        title="Accessibility Statement - MotorVault"
        description="MotorVault Accessibility Statement. We're committed to making our website accessible to all users."
        keywords={['accessibility', 'WCAG', 'inclusive design', 'accessibility statement']}
        canonical="https://motorvault.com/accessibility"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Accessibility Statement</h1>
        <p className="text-gray-600 mb-8">Last updated: April 30, 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Commitment to Accessibility</h2>
            <p className="text-gray-600">MotorVault is committed to ensuring that our website is accessible to all people, including those with disabilities. We actively work to increase the accessibility and usability of our website and strive to conform with accepted accessibility standards and guidelines.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Accessibility Features</h2>
            <p className="text-gray-600 mb-4">Our website includes the following accessibility features:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Semantic HTML markup for improved screen reader compatibility</li>
              <li>Keyboard navigation support for all interactive elements</li>
              <li>Clear and descriptive link text instead of generic terms like "click here"</li>
              <li>Alt text for all images describing their content and function</li>
              <li>Color contrast ratios that meet or exceed WCAG AA standards</li>
              <li>Resizable text and responsive design for various device sizes</li>
              <li>Form labels and error messages clearly associated with inputs</li>
              <li>Skip navigation links to bypass repetitive content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">WCAG Compliance</h2>
            <p className="text-gray-600">We aim to comply with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. While we have made significant efforts to ensure accessibility, we recognize that no website is perfect and continuous improvement is necessary.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Assistive Technologies</h2>
            <p className="text-gray-600">Our website has been tested with and is compatible with the following assistive technologies:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
              <li>Voice control software</li>
              <li>Speech-to-text applications</li>
              <li>Browser zoom and text sizing tools</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Accessibility Issues</h2>
            <p className="text-gray-600">If you encounter any accessibility issues or barriers while using our website, please let us know. We take these reports seriously and work quickly to resolve them. <a href="/contact" className="text-blue-600 hover:underline">Contact us</a> with details about the issue and how you are accessing our website.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Content</h2>
            <p className="text-gray-600">MotorVault does not control third-party websites that may be linked from our site. We recommend checking the accessibility statement of those websites to understand their accessibility measures.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Accessibility Standards</h2>
            <p className="text-gray-600">For more information about web accessibility standards and guidelines, visit:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Web Accessibility Initiative (WAI)</a></li>
              <li><a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">WCAG 2.1 Quick Reference</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact for Accessibility Support</h2>
            <p className="text-gray-600">
              If you need accessibility assistance or have concerns about website accessibility, please <a href="/contact" className="text-blue-600 hover:underline">contact us</a> and our team will be happy to help.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
