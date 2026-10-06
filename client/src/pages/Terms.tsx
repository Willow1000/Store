import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";

export default function Terms() {
  return (
    <>
      <SEOHead
        pageType="policy"
        title="Terms of Service - MotorVault"
        description="MotorVault Terms of Service. Our terms and conditions for using the platform, shopping, returns, and more."
        keywords={[
          "terms of service",
          "terms and conditions",
          "user agreement",
          "legal",
        ]}
        canonical="https://motorvault.shop/terms"
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          narrow
          title="Terms of Service"
          description="Last updated: April 30, 2026"
          breadcrumb={[{ label: "Terms of Service", href: "/terms" }]}
        />
        <div className="container py-8 sm:py-12">
          <div className="prose-page mx-auto max-w-3xl">
            <section>
              <h2>1. Introduction and Scope</h2>
              <p>
                These Terms of Service constitute a binding agreement between
                you and MotorVault governing your access to and use of our
                website, digital services, product listings, checkout flow,
                account features, support channels, and any ancillary content or
                functionality made available by us. By browsing, registering,
                purchasing, or otherwise interacting with our services, you
                acknowledge that you have read, understood, and agreed to be
                bound by these Terms.
              </p>
              <p>
                If you are using the services on behalf of a company,
                organization, or other legal entity, you represent that you are
                authorized to bind that entity and that both you and the entity
                will be responsible for compliance with these Terms.
              </p>
            </section>

            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                Your continued use of the website constitutes your affirmative
                acceptance of these Terms, including any incorporated policies,
                notices, and guidelines referenced herein. If you do not agree
                to these Terms in full, you must discontinue use of the website
                and associated services immediately.
              </p>
            </section>

            <section>
              <h2>2. Permitted Use</h2>
              <p>
                We grant you a limited, revocable, non-exclusive,
                non-transferable license to access and use the website for
                lawful personal and commercial shopping purposes, subject at all
                times to these Terms and applicable law. This license is granted
                solely to enable normal browsing, product discovery, account
                management, order placement, and related customer support
                functions.
              </p>
              <ul>
                <li>
                  Reproduce, duplicate, copy, sell, resell, or exploit any
                  portion of the site without our prior written consent.
                </li>
                <li>
                  Interfere with, disrupt, damage, reverse engineer, or attempt
                  to derive source code from any portion of the website or its
                  supporting systems.
                </li>
                <li>
                  Use automated means, bots, scrapers, or other unauthorized
                  tools to access, harvest, or manipulate content, pricing, or
                  inventory data.
                </li>
                <li>
                  Misrepresent your identity, payment details, shipping
                  information, or account credentials.
                </li>
                <li>
                  Use the services for any unlawful, deceptive, abusive, or
                  commercially exploitative purpose.
                </li>
              </ul>
            </section>

            <section>
              <h2>3. Account Registration and Security</h2>
              <p>
                Certain features may require you to create an account. You are
                responsible for providing accurate, complete, and current
                information at all times. You must maintain the confidentiality
                of your login credentials and are solely responsible for all
                activity occurring under your account.
              </p>
              <p>
                We may suspend, restrict, or terminate accounts where we
                reasonably believe that credentials have been compromised,
                information is materially inaccurate, or activity suggests
                fraud, abuse, or misuse of the platform.
              </p>
            </section>

            <section>
              <h2>4. Product Information, Pricing, and Availability</h2>
              <p>
                We endeavor to present product descriptions, compatibility
                details, pricing, promotions, and availability information with
                a high degree of accuracy. However, occasional errors,
                omissions, or delays may occur due to supplier feeds, catalog
                updates, or inventory synchronization.
              </p>
              <p>
                We reserve the right to correct inaccuracies, update
                descriptions, cancel orders affected by manifest error, and
                revise prices or stock levels at any time before shipment
                confirmation. In the event of a pricing or availability
                discrepancy, we may contact you to confirm how you wish to
                proceed.
              </p>
            </section>

            <section>
              <h2>5. Orders, Acceptance, and Payment</h2>
              <p>
                Submitting an order constitutes an offer to purchase the
                selected items. An order is not deemed accepted until we issue a
                confirmation, ship the items, or otherwise expressly acknowledge
                acceptance. We may decline or cancel an order for any lawful
                reason, including suspected fraud, supply constraints, or
                verification issues.
              </p>
              <p>
                You represent that all payment details submitted are valid and
                authorized for use. Charges, taxes, duties, shipping fees, and
                other applicable amounts will be disclosed during checkout or in
                a subsequent order notice where required.
              </p>
            </section>

            <section>
              <h2>6. Intellectual Property</h2>
              <p>
                All website content, including text, graphics, logos, images,
                product arrangements, software, user interface elements, and
                associated trade dress, is owned by or licensed to MotorVault
                and protected by intellectual property and unfair competition
                laws. Except as expressly permitted, no right, title, or
                interest is transferred to you by virtue of using the services.
              </p>
              <p>
                Any unauthorized reproduction, adaptation, distribution, or
                public display of protected content may result in civil,
                administrative, or criminal liability where applicable.
              </p>
            </section>

            <section>
              <h2>7. Warranty Disclaimer</h2>
              <p>
                To the maximum extent permitted by law, the website and all
                content, services, and materials are provided on an "as is" and
                "as available" basis without warranties of any kind, whether
                express, implied, statutory, or otherwise. We disclaim implied
                warranties of merchantability, fitness for a particular purpose,
                title, and non-infringement.
              </p>
              <p>
                We do not warrant that the services will be uninterrupted,
                error-free, secure, or free from harmful components, nor do we
                warrant that product recommendations will be suitable for every
                vehicle configuration or use case.
              </p>
            </section>

            <section>
              <h2>8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, MotorVault shall not be
                liable for indirect, incidental, special, consequential,
                exemplary, or punitive damages, including lost profits, loss of
                data, business interruption, or reputational harm, arising out
                of or relating to your use of the website or products purchased
                through it.
              </p>
              <p>
                Where liability cannot be disclaimed, our aggregate liability
                will be limited to the amount paid by you for the specific
                product or service giving rise to the claim, unless applicable
                law requires otherwise.
              </p>
            </section>

            <section>
              <h2>9. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless MotorVault and
                its affiliates, officers, directors, employees, contractors, and
                agents from and against any claims, losses, liabilities,
                damages, costs, and expenses arising from your violation of
                these Terms, misuse of the services, infringement of third-party
                rights, or violation of applicable law.
              </p>
            </section>

            <section>
              <h2>10. Governing Law and Dispute Resolution</h2>
              <p>
                These Terms are governed by the laws applicable to the
                jurisdiction in which MotorVault is established, without regard
                to conflict-of-law principles. Any dispute arising from or
                relating to these Terms shall be brought before the competent
                courts of that jurisdiction, unless a mandatory consumer
                protection rule requires a different forum.
              </p>
              <p>
                Before initiating formal proceedings, we encourage you to
                contact us directly so we may attempt to resolve the matter in
                good faith and without unnecessary delay.
              </p>
            </section>

            <section>
              <h2>11. Modifications and Termination</h2>
              <p>
                We may revise these Terms from time to time to reflect changes
                in our operations, legal obligations, or service offerings. When
                we do, the updated version will be posted on this page with a
                revised effective date. Your continued use of the services after
                changes become effective constitutes acceptance of the revised
                Terms.
              </p>
              <p>
                We reserve the right to suspend or terminate access to the
                services at our discretion, with or without notice, where
                permitted by law and particularly where we determine that a user
                has engaged in conduct that is unlawful, abusive, or materially
                inconsistent with these Terms.
              </p>
            </section>

            <section>
              <h2>12. Third-Party Services and External Dependencies</h2>
              <p>
                The website may reference, interface with, or rely upon
                third-party services including payment gateways, fulfillment
                partners, analytics providers, communications vendors, and
                external content sources. These third parties are independent of
                MotorVault and operate under their own terms, policies, and
                technical limitations.
              </p>
              <p>
                We are not responsible for the availability, accuracy, security,
                or performance of any third-party service, nor do we guarantee
                that such services will remain compatible with our platform
                indefinitely. Any dispute concerning a third-party service is
                governed by that provider's own contractual and legal framework.
              </p>
            </section>

            <section>
              <h2>13. Force Majeure</h2>
              <p>
                We shall not be liable for any delay, interruption, or failure
                in performance caused by events beyond our reasonable control,
                including but not limited to natural disasters, public health
                emergencies, supply chain disruption, labor shortages, carrier
                delays, governmental action, network failures, cyber incidents,
                power outages, or acts of war or civil unrest.
              </p>
            </section>

            <section>
              <h2>14. Severability; Waiver</h2>
              <p>
                If any provision of these Terms is held to be invalid, unlawful,
                or unenforceable, that provision shall be modified or severed to
                the minimum extent necessary, and the remaining provisions shall
                remain in full force and effect. No waiver of any provision
                shall be deemed a continuing waiver or a waiver of any other
                provision unless expressly stated in writing.
              </p>
              <p>
                Our failure to enforce any right or remedy shall not constitute
                a waiver of that right or remedy.
              </p>
            </section>

            <section>
              <h2>15. Entire Agreement</h2>
              <p>
                These Terms, together with our incorporated policies and any
                supplemental terms expressly identified at checkout or within
                the relevant service, constitute the entire agreement between
                you and MotorVault concerning the subject matter addressed
                herein and supersede all prior or contemporaneous
                understandings, whether oral or written.
              </p>
            </section>

            <section>
              <h2>16. Contact Us</h2>
              <p>
                If you have questions about these Terms of Service, please{" "}
                <a href="/contact">contact us</a> for assistance.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
