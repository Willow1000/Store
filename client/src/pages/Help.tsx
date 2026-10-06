import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { RelatedLinks } from "@/components/RelatedLinks";
import { Link } from "wouter";

function buildFitmentHelpHref() {
  const subject = "Need help confirming part fitment";
  const message =
    "Hello MotorVault team,\n\nPlease help confirm fitment before I order.\n\nVehicle details:\n- VIN:\n- Make/Model/Year:\n- Engine/Trim:\n\nPart details:\n- Part name:\n- Known part number (if any):\n- Photos (if available):\n\nThank you.";

  const params = new URLSearchParams({
    subject,
    message,
    enquiry: "1",
  });

  return `/contact?${params.toString()}`;
}

export default function Help() {
  const fitmentHelpHref = buildFitmentHelpHref();

  return (
    <>
      <SEOHead
        pageType="policy"
        title="Help Center: Fitment, Quality & Returns | MotorVault"
        description="Get practical help with VIN fitment checks, OEM vs aftermarket decisions, returns, warranty questions, pricing confidence, and DIY vs mechanic choices."
        keywords={[
          "auto parts help",
          "VIN fitment",
          "OEM vs aftermarket",
          "returns",
          "warranty",
          "DIY vs mechanic",
        ]}
        canonical="https://motorvault.shop/help"
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          title="Help Center"
          description="Built around the most common auto-parts buyer questions so you can choose correctly before you pay."
          breadcrumb={[{ label: "Help Center", href: "/help" }]}
        />
        <div className="container py-8 sm:py-12">
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            <Link
              href={fitmentHelpHref}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <p className="eyebrow">Fitment First</p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                Need VIN-based fitment help?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Send your details and we will help verify compatibility before
                checkout.
              </p>
            </Link>
            <Link
              href="/faq"
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <p className="eyebrow">Part Choice</p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                OEM vs aftermarket vs used
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Understand quality tiers and where premium options matter most.
              </p>
            </Link>
            <Link
              href="/returns"
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <p className="eyebrow">After Purchase</p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                Returns and warranty clarity
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Know what happens if a part does not fit or arrives with an
                issue.
              </p>
            </Link>
          </div>

          <div className="prose-page max-w-3xl">
            <section>
              <h2>1. Before You Buy: Fitment and Part Identification</h2>
              <ul>
                <li>
                  Best practice is to provide VIN, make/model/year, and
                  engine/trim for compatibility checks.
                </li>
                <li>
                  If VIN is unavailable, share part number and photos of the old
                  part.
                </li>
                <li>
                  For fluids and spec-sensitive parts, confirm exact standards
                  from your service manual.
                </li>
              </ul>
              <p>
                <Link href="/vin-decoder">
                  Not sure it fits? Decode your VIN
                </Link>
              </p>
            </section>

            <section>
              <h2>2. Choosing the Right Part Type</h2>
              <ul>
                <li>OEM: strongest baseline for exact spec matching.</li>
                <li>
                  Aftermarket: wider budget range with varying quality tiers.
                </li>
                <li>
                  Used/refurbished: good value for suitable categories, but use
                  extra caution for safety-critical systems.
                </li>
              </ul>
              <p>
                Compare by fitment certainty, warranty terms, and long-term
                reliability, not just lowest price.
              </p>
            </section>

            <section>
              <h2>3. Pricing Confidence and Scam Avoidance</h2>
              <ul>
                <li>
                  Confirm what is included in the box before ordering (hardware,
                  seals, accessories).
                </li>
                <li>Compare equivalent part numbers and quality tiers.</li>
                <li>
                  Watch for unrealistically low prices without clear
                  specification coverage.
                </li>
              </ul>
            </section>

            <section>
              <h2>4. Returns, Warranty, and Wrong-Part Handling</h2>
              <ul>
                <li>
                  Keep original packaging and documentation until fitment is
                  confirmed.
                </li>
                <li>
                  If you receive the wrong part or an issue appears, contact
                  support quickly with photos and order details.
                </li>
                <li>
                  Review return eligibility and warranty coverage before
                  installation.
                </li>
              </ul>
            </section>

            <section>
              <h2>5. DIY vs Professional Installation</h2>
              <ul>
                <li>
                  DIY works best for low-risk, tool-friendly jobs with clear
                  procedures.
                </li>
                <li>
                  Use a professional mechanic for safety-critical,
                  calibration-heavy, or high-labor components.
                </li>
                <li>
                  Before buying, ask your mechanic for exact part numbers and
                  required companion items.
                </li>
              </ul>
            </section>

            <section>
              <h2>Need Personal Help?</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row [&_a]:no-underline">
                <Link href={fitmentHelpHref}>
                  <a className="btn-primary !text-white">
                    Request fitment check
                  </a>
                </Link>
                <Link href="/faq">
                  <a className="btn-secondary">Browse full FAQ</a>
                </Link>
                <Link href="/contact">
                  <a className="btn-secondary">Contact support</a>
                </Link>
              </div>
            </section>
            <RelatedLinks
              className="mt-10 border-t border-gray-200 pt-6"
              links={[
                { href: "/vin-decoder", label: "VIN Decoder" },
                { href: "/blog", label: "Blog" },
                { href: "/shipping", label: "Shipping Info" },
                { href: "/returns", label: "Returns" },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
