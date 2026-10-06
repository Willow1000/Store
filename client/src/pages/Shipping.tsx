import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { RelatedLinks } from "@/components/RelatedLinks";
import {
  SHIPPING_RATE_PERCENT,
  formatPrice,
  getFreeShippingThresholdUsd,
} from "@shared/shipping";

export default function Shipping() {
  return (
    <>
      <SEOHead
        pageType="policy"
        title="Shipping Information - MotorVault"
        description="How MotorVault charges shipping: 5% of the order subtotal, free on orders of $1,500 or more. Order tracking, international delivery and restrictions."
        keywords={["shipping", "delivery", "shipping costs", "delivery times"]}
        canonical="https://motorvault.shop/shipping"
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          narrow
          title="Shipping Information"
          breadcrumb={[{ label: "Shipping Information", href: "/shipping" }]}
        />
        <div className="container py-8 sm:py-12">
          <div className="prose-page mx-auto max-w-3xl">
            <section>
              <h2>Shipping Rates</h2>
              {/* Must match calculateShipping() in shared/shipping.ts, which
                  is what checkout charges and what the product feed and
                  product structured data publish. */}
              <p>
                Shipping is charged at {SHIPPING_RATE_PERCENT}% of your order
                subtotal, and is free on orders of{" "}
                {formatPrice(getFreeShippingThresholdUsd())} or more. The exact
                amount is shown in your order summary before you pay.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="!mb-1 !mt-0">
                    Orders under {formatPrice(getFreeShippingThresholdUsd())}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {SHIPPING_RATE_PERCENT}% of the order subtotal
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="!mb-1 !mt-0">
                    Orders of {formatPrice(getFreeShippingThresholdUsd())} or
                    more
                  </h3>
                  <p className="text-sm text-gray-600">Free shipping</p>
                </div>
              </div>
            </section>

            <section>
              <h2>Delivery Times</h2>
              <p>
                Delivery time depends on the item and where it ships from and
                to. If you need a part by a certain date,{" "}
                <a href="/contact">contact us</a> before ordering and we will
                confirm an estimate.
              </p>
            </section>

            <section>
              <h2>International Shipping</h2>
              <p>
                We currently ship to select countries. Delivery times and costs
                vary by location. Please add items to your cart to see available
                shipping options for your region.
              </p>
            </section>

            <section>
              <h2>Order Tracking</h2>
              <p>
                Once your order ships, you'll receive a tracking number via
                email. You can track your package in real-time through your
                order details page.
              </p>
            </section>

            <section>
              <h2>Shipping Restrictions</h2>
              <ul>
                <li>
                  Some items may have shipping restrictions due to weight, size,
                  or regulations
                </li>
                <li>Hazardous materials cannot be shipped</li>
                <li>
                  Orders to P.O. boxes are not available for all shipping
                  methods
                </li>
              </ul>
            </section>

            <section>
              <h2>Need Help?</h2>
              <p>
                Visit our <a href="/help">Help Center</a> or{" "}
                <a href="/contact">contact us</a> for shipping questions.
              </p>
            </section>
            <RelatedLinks
              className="mt-10 border-t border-gray-200 pt-6"
              links={[
                { href: "/returns", label: "Returns" },
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
