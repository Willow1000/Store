import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { RelatedLinks } from "@/components/RelatedLinks";

export default function Returns() {
  return (
    <>
      <SEOHead
        pageType="policy"
        title="Returns & Refunds - MotorVault"
        description="MotorVault Returns & Refunds policy. Learn about our 30-day return policy, refund process, and warranty information."
        keywords={["returns", "refunds", "return policy", "warranty"]}
        canonical="https://motorvault.shop/returns"
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          narrow
          title="Returns & Refunds"
          breadcrumb={[{ label: "Returns & Refunds", href: "/returns" }]}
        />
        <div className="container py-8 sm:py-12">
          <div className="prose-page mx-auto max-w-3xl">
            <section>
              <h2>Policy Overview</h2>
              <p>
                MotorVault aims to provide a structured, transparent returns
                framework that balances customer satisfaction with product
                integrity, fraud prevention, and operational practicality. This
                policy applies to eligible physical merchandise purchased
                through our website and is intended to supplement, not override,
                any rights that may arise under applicable consumer law.
              </p>
              <p>
                Because many automotive parts are condition-sensitive,
                compatibility-sensitive, or installation-sensitive, return
                eligibility may depend on packaging integrity, product
                condition, and the nature of the item purchased.
              </p>
            </section>

            <section>
              <h2>30-Day Return Policy</h2>
              <p>
                We want you to be satisfied with your purchase. Subject to the
                conditions below, you may request a return within 30 days of
                delivery for eligible items. Return requests initiated after
                this window may be declined unless a separate warranty remedy or
                consumer right applies.
              </p>
            </section>

            <section>
              <h2>Return Eligibility</h2>
              <p>
                Items must meet the following conditions to qualify for return
                consideration:
              </p>
              <ul>
                <li>
                  Purchased within the last 30 days and not marked as final sale
                  or non-returnable.
                </li>
                <li>
                  Unused, uninstalled, and in original condition, free from
                  fluid contamination, damage, or wear.
                </li>
                <li>
                  Returned with original packaging, accessories, documentation,
                  and any included promotional items where applicable.
                </li>
                <li>
                  Accompanied by proof of purchase, such as an order number or
                  receipt.
                </li>
              </ul>
            </section>

            <section>
              <h2>How to Return an Item</h2>
              <ol className="!list-none space-y-3 !pl-0">
                <li>
                  <span className="font-semibold text-ink">
                    1. Request Return:
                  </span>{" "}
                  Log in to your account or contact support to request
                  authorization for the return.
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    2. Receive Instructions:
                  </span>{" "}
                  We will provide return instructions and, where applicable, a
                  prepaid label or shipping authorization number.
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    3. Package Securely:
                  </span>{" "}
                  Pack the item carefully to avoid transit damage and include
                  all required accessories and documentation.
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    4. Inspection and Resolution:
                  </span>{" "}
                  Once received, we inspect the item and determine whether a
                  refund, replacement, or other resolution is appropriate.
                </li>
              </ol>
            </section>

            <section>
              <h2>Refund Timeline</h2>
              <p>Refunds, when approved, are processed as follows:</p>
              <ul>
                <li>
                  Processing: typically 5-7 business days after the returned
                  item is received and verified.
                </li>
                <li>
                  Credit to Account: additional time may be required for your
                  bank or payment provider to post the funds.
                </li>
                <li>
                  Charge reversals: card issuers may require one or more billing
                  cycles before the credit appears.
                </li>
              </ul>
            </section>

            <section>
              <h2>Exclusions</h2>
              <p>
                The following items are generally not eligible for return,
                except where required by law or where a separate written
                authorization has been issued:
              </p>
              <ul>
                <li>Used, installed, modified, or damaged items.</li>
                <li>
                  Items returned without original packaging or essential
                  accessories.
                </li>
                <li>
                  Custom, personalized, special-order, or non-stock items.
                </li>
                <li>
                  Digital products, software, or services already rendered.
                </li>
                <li>
                  Items explicitly designated as final sale, clearance, or
                  non-returnable.
                </li>
              </ul>
            </section>

            <section>
              <h2>Defective or Damaged Items</h2>
              <p>
                If you receive a defective, damaged, or materially incorrect
                item, please notify us promptly with photographs and a
                description of the issue. Where verified, we may offer a
                replacement, repair, partial credit, or full refund depending on
                the circumstances and inventory availability.
              </p>
              <p>
                Please <a href="/contact">contact us</a> as soon as possible so
                we can assess the issue and provide the appropriate resolution
                path.
              </p>
            </section>

            <section>
              <h2>Inspection Rights</h2>
              <p>
                We reserve the right to inspect all returned merchandise before
                issuing a refund or replacement. If an item shows signs of use,
                missing components, physical alteration, or improper packaging,
                we may reject the return or issue a reduced refund to reflect
                diminished value where permitted by law.
              </p>
            </section>
            <RelatedLinks
              className="mt-10 border-t border-gray-200 pt-6"
              links={[
                { href: "/shipping", label: "Shipping Info" },
                { href: "/faq", label: "FAQ" },
                { href: "/help", label: "Help Center" },
                { href: "/contact", label: "Contact Us" },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
