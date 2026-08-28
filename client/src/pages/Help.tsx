import { SEOHead } from "@/components/SEOHead";
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
        title="Help Center - Auto Parts Fitment, Quality, Returns | MotorVault"
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
      <div className="min-h-screen bg-background pt-6">
        <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-gray-700 text-lg mb-8">
            Built around the most common auto-parts buyer questions so you can
            choose correctly before you pay.
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-10">
            <Link
              href={fitmentHelpHref}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Fitment First
              </p>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                Need VIN-based fitment help?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Send your details and we will help verify compatibility before
                checkout.
              </p>
            </Link>
            <Link
              href="/faq"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Part Choice
              </p>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                OEM vs aftermarket vs used
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Understand quality tiers and where premium options matter most.
              </p>
            </Link>
            <Link
              href="/returns"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                After Purchase
              </p>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                Returns and warranty clarity
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Know what happens if a part does not fit or arrives with an
                issue.
              </p>
            </Link>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                1. Before You Buy: Fitment and Part Identification
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
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
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Choosing the Right Part Type
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>OEM: strongest baseline for exact spec matching.</li>
                <li>
                  Aftermarket: wider budget range with varying quality tiers.
                </li>
                <li>
                  Used/refurbished: good value for suitable categories, but use
                  extra caution for safety-critical systems.
                </li>
              </ul>
              <p className="text-gray-600 mt-3">
                Compare by fitment certainty, warranty terms, and long-term
                reliability, not just lowest price.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. Pricing Confidence and Scam Avoidance
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
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
              <h2 className="text-2xl font-semibold mb-4">
                4. Returns, Warranty, and Wrong-Part Handling
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
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
              <h2 className="text-2xl font-semibold mb-4">
                5. DIY vs Professional Installation
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
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
              <h2 className="text-2xl font-semibold mb-4">
                Need Personal Help?
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={fitmentHelpHref}>
                  <a className="inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800 transition-colors">
                    Request fitment check
                  </a>
                </Link>
                <Link href="/faq">
                  <a className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-colors">
                    Browse full FAQ
                  </a>
                </Link>
                <Link href="/contact">
                  <a className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-colors">
                    Contact support
                  </a>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
