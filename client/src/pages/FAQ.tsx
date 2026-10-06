import { useMemo, useState } from "react";
import {
  ChevronDown,
  MessageSquarePlus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { RelatedLinks } from "@/components/RelatedLinks";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  // Buying with confidence: the questions shoppers check before trusting an
  // online parts store ("is ... legit", "is it safe to pay", warranty,
  // returns). Answers state only what the store's own policies say.
  {
    id: "trust-1",
    category: "Buying with confidence",
    question: "Is MotorVault a legitimate store?",
    answer:
      "Yes. MotorVault is an online auto parts store with a published business address (Nijverheidsweg 27, Heinenoord, Netherlands), a support team you can reach by email at support@motorvault.shop or on WhatsApp at +1 443-554-0384, and published shipping, returns, privacy and terms pages. Payments are processed by Stripe, and every order gets a confirmation email.",
  },
  {
    id: "trust-2",
    category: "Buying with confidence",
    question: "Is it safe to pay on MotorVault?",
    answer:
      "Yes. Checkout uses Stripe's secure payment page: you enter your card details on Stripe, not on our site, so we never see or store your card number. You see the full total, including shipping and any discount, before you pay.",
  },
  {
    id: "trust-3",
    category: "Buying with confidence",
    question: "How can I be sure a part fits before I order?",
    answer:
      "Each listing states the vehicles, model years and part numbers it fits. Decode your VIN with our free VIN decoder to confirm your exact model, engine and trim, or send us your VIN on WhatsApp or by email before ordering and we will check the part against it.",
  },
  {
    id: "trust-4",
    category: "Buying with confidence",
    question: "What if the part doesn't fit or I change my mind?",
    answer:
      "You can request a return within 30 days of delivery for items that are unused, uninstalled and in their original condition and packaging, with proof of purchase. Approved refunds are processed within about 5-7 business days of us receiving the item. Items marked final sale, and used or installed items, are excluded; see the Returns page for the full policy.",
  },
  {
    id: "trust-5",
    category: "Buying with confidence",
    question: "What if my order arrives damaged or I receive the wrong item?",
    answer:
      "Contact us as soon as possible with photos of the item and the packaging and a short description. Once verified, we will offer a replacement, repair, partial credit or full refund depending on the situation and stock.",
  },
  {
    id: "trust-6",
    category: "Buying with confidence",
    question: "How much does shipping cost?",
    answer:
      "Shipping is 5% of your order subtotal, and free on orders of $1,500 or more. The exact amount is shown in your order summary before you pay, and you receive tracking details once your order ships.",
  },
  {
    id: "trust-7",
    category: "Buying with confidence",
    question: "Do you ship to the United States?",
    answer:
      "Yes, we ship to the United States and Canada as well as across Europe. Delivery time depends on the item and its destination; if you need a part by a certain date, contact us before ordering for an estimate.",
  },
  {
    id: "trust-8",
    category: "Buying with confidence",
    question: "Which currency will I be charged in?",
    answer:
      "Prices are listed in US dollars. Where available, checkout shows and charges your local currency, converted at the rate quoted on the page, so the amount you approve on the payment page is the amount you are charged.",
  },
  {
    id: "trust-9",
    category: "Buying with confidence",
    question: "What do New, Used, Like new and Remanufactured mean?",
    answer:
      "New parts are unused and in original packaging. Used parts were removed from a vehicle and are sold in the condition described in the listing. Like new means used with minimal signs of use. Remanufactured parts have been rebuilt to working specification. If a listing doesn't answer a question about condition, ask us before you buy.",
  },
  {
    id: "trust-10",
    category: "Buying with confidence",
    question: "How do I contact you, and how quickly do you reply?",
    answer:
      "Email support@motorvault.shop, message us on WhatsApp at +1 443-554-0384, or use the contact form or a support ticket. Our support hours are Monday to Friday, 9 AM to 6 PM, and Saturday, 10 AM to 4 PM.",
  },
  {
    id: "fitment-1",
    category: "Fitment and part identification",
    question: "Do I need to know a lot about cars before buying parts?",
    answer:
      "No. You can still order confidently if you share the key identifiers: VIN, make, model, year, engine, and the issue you are fixing. We use that information to help narrow fitment before checkout.",
  },
  {
    id: "fitment-2",
    category: "Fitment and part identification",
    question:
      "How do I find the right part if I don't know my exact model details?",
    answer:
      "Start with VIN and any part number on the old component. If you do not have a part number, send clear photos plus make/model/year. We can often identify the correct part path from that.",
  },
  {
    id: "fitment-3",
    category: "Fitment and part identification",
    question: "How does VIN help with part matching?",
    answer:
      "VIN allows us to verify trim, engine family, production range, and compatibility notes that generic searches can miss. This reduces wrong-part risk significantly.",
  },
  {
    id: "fitment-4",
    category: "Fitment and part identification",
    question: "Can I buy parts without VIN?",
    answer:
      "Yes, but VIN is strongly recommended for fitment-critical parts. Without VIN, provide make/model/year/engine code and part photos so we can still run the best possible compatibility check.",
  },
  {
    id: "fitment-5",
    category: "Fitment and part identification",
    question: "How do I know a part will fit my vehicle?",
    answer:
      "Check compatibility notes on the listing, verify OEM/part numbers where available, and confirm with support before purchase for high-risk components. We recommend fitment confirmation before payment if anything is unclear.",
  },
  {
    id: "quality-1",
    category: "Quality and part options",
    question: "What's the difference between OEM and aftermarket parts?",
    answer:
      "OEM parts are built to original manufacturer specifications. Aftermarket parts are made by third-party brands and can vary by quality tier. We label part type in listings so you can choose based on budget and performance needs.",
  },
  {
    id: "quality-2",
    category: "Quality and part options",
    question:
      "What's the difference between premium and standard aftermarket parts?",
    answer:
      "Premium lines usually offer tighter tolerances, better materials, and stronger durability/warranty terms. Standard lines are more budget-focused. We recommend premium for safety-critical or high-labor replacements.",
  },
  {
    id: "quality-3",
    category: "Quality and part options",
    question: "Should I buy used or refurbished auto parts?",
    answer:
      "Used or refurbished can be a smart value option for non-safety-critical components when condition is verified. For high-risk systems, choose carefully and prioritize tested units with clear provenance.",
  },
  {
    id: "quality-4",
    category: "Quality and part options",
    question: "What parts should I avoid buying used?",
    answer:
      "Be cautious with safety-critical items such as brake friction materials, airbags/SRS components, heavily worn suspension items, and unknown-history electronics where failure risk is high. Choose verified quality sources for these categories.",
  },
  {
    id: "pricing-1",
    category: "Pricing, returns, and warranty",
    question: "What's a reasonable price for common replacement parts?",
    answer:
      "Compare by brand tier, warranty length, and fitment certainty, not just headline price. Extremely low prices can indicate lower quality, incomplete kits, or unknown sourcing.",
  },
  {
    id: "pricing-2",
    category: "Pricing, returns, and warranty",
    question: "How can I avoid overpaying or being scammed on parts pricing?",
    answer:
      "Check part numbers, compare equivalent options, confirm what is included in the box, and verify return/warranty terms before purchase. Ask for fitment confirmation when uncertain.",
  },
  {
    id: "pricing-3",
    category: "Pricing, returns, and warranty",
    question: "Can I return parts that don't fit?",
    answer:
      "Eligible items can be returned under our returns policy. Fitment-related returns are easier when part numbers, VIN confirmation steps, and packaging are preserved. Review the return conditions before installation.",
  },
  {
    id: "pricing-4",
    category: "Pricing, returns, and warranty",
    question: "Will changing parts affect my vehicle warranty?",
    answer:
      "It can, depending on part type, brand, and local warranty terms. For warranty-sensitive vehicles, confirm acceptable specifications with your service provider before ordering.",
  },
  {
    id: "pricing-5",
    category: "Pricing, returns, and warranty",
    question: "How long will shipping take and will I get tracking?",
    answer:
      "Delivery time depends on the item and its destination. Shipping costs 5% of the order subtotal (free on orders of $1,500 or more), and we send tracking details once your order ships. Contact us before ordering if you need a delivery estimate.",
  },
  {
    id: "shipping-1",
    category: "Shipping and operating countries",
    question: "Which countries in Europe do you operate in?",
    answer:
      "We operate across Europe, including: Albania, Andorra, Armenia, Austria, Azerbaijan, Belarus, Belgium, Bosnia and Herzegovina, Bulgaria, Croatia, Cyprus, Czechia, Denmark, Estonia, Finland, France, Georgia, Germany, Greece, Hungary, Iceland, Ireland, Italy, Kosovo, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Moldova, Monaco, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Russia, San Marino, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Turkey, Ukraine, United Kingdom, and Vatican City.",
  },
  {
    id: "diy-1",
    category: "DIY vs professional installation",
    question: "How do I decide between DIY installation and using a mechanic?",
    answer:
      "Use DIY for low-risk, tool-friendly jobs and choose professional installation for safety-critical, calibration-heavy, or labor-intensive parts. If unsure, ask a mechanic before ordering.",
  },
  {
    id: "diy-2",
    category: "DIY vs professional installation",
    question: "What should I ask a mechanic before buying parts?",
    answer:
      "Ask for exact part numbers, whether OEM is required, which related seals/bolts/fluids must be replaced, labor estimate, and whether programming or calibration is needed after installation.",
  },
  {
    id: "diy-3",
    category: "DIY vs professional installation",
    question:
      "What information do I need before buying transmission fluid or similar specification-sensitive items?",
    answer:
      "Use the exact specification from your manual or service data, including viscosity/standard approvals and fill capacity. Buying by vehicle year alone is not always enough for fluids.",
  },
  {
    id: "listing-1",
    category: "Request a part and support",
    question: "Can I request that a specific part be listed?",
    answer:
      "Yes. If you have a part you want us to source or list, use the Contact Us page and we will review the request. Include the part name, part number if you have it, the vehicle make/model/year, and any photos or notes that help us identify it accurately.",
  },
  {
    id: "listing-2",
    category: "Request a part and support",
    question: "Can your team help identify unknown parts?",
    answer:
      "Yes. Send clear photos, dimensions where possible, and vehicle details. If there is a stamped number on the part, include that too. This speeds up accurate identification.",
  },
  {
    id: "listing-3",
    category: "Request a part and support",
    question: "Do I need a special license to buy any parts?",
    answer:
      "Most consumer replacement parts do not require a special license. Some regulated or hazardous items may have restrictions depending on local law. If uncertain, contact us before ordering.",
  },
];

function buildFitmentCheckHref() {
  const subject = "VIN fitment check before purchase";
  const message =
    "Hello MotorVault team,\n\nPlease help me confirm fitment before I order.\n\nVehicle details:\n- VIN:\n- Make/Model/Year:\n- Engine/Trim:\n\nPart details:\n- Part name:\n- Part number (if known):\n- Photos (if available):\n\nThank you.";
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: "1",
  });
  return `/contact?${params.toString()}`;
}

function buildListingRequestHref() {
  const subject = "Request to list a specific part";
  const message =
    "Hello MotorVault team,\n\nI would like to request that a specific part be listed on your platform.\n\nPart details:\n- Part name:\n- Vehicle make/model/year:\n- OEM or aftermarket preference:\n- Any part numbers or photos:\n\nThank you.";
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: "1",
  });
  return `/contact?${params.toString()}`;
}

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const categories = useMemo(
    () => Array.from(new Set(faqItems.map(item => item.category))),
    []
  );
  const listingRequestHref = buildListingRequestHref();
  const fitmentCheckHref = buildFitmentCheckHref();

  return (
    <>
      <SEOHead
        pageType="faq"
        title="FAQ - MotorVault Automotive Parts Help"
        description="Answers about sourcing, authenticity, quality checks, shipping, returns, warranties, and payment terms."
        keywords={[
          "auto parts FAQ",
          "sourcing",
          "quality control",
          "shipping",
          "returns",
          "warranty",
          "contact support",
        ]}
        canonical="https://motorvault.shop/faq"
        faqData={faqItems.map(item => ({
          question: item.question,
          answer: item.answer,
        }))}
      />

      <div className="min-h-screen bg-white">
        <PageHeader
          eyebrow="Help center"
          title="Frequently asked questions"
          description="We focus on the questions auto-parts buyers ask most: fitment, VIN checks, OEM vs aftermarket differences, return eligibility, pricing confidence, and when to DIY versus use a mechanic."
          breadcrumb={[{ label: "FAQ", href: "/faq" }]}
        />

        <div className="container py-8 sm:py-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
            {/* Help cards: above the questions on phones, beside them on desktop */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:order-last">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 flex-none text-ink"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-sans text-[15px] font-semibold tracking-normal text-ink">
                      Need help confirming fitment first?
                    </h2>
                    <p className="mt-1.5 text-sm text-gray-700">
                      Send VIN plus part details and we will help you validate
                      compatibility before checkout.
                    </p>
                  </div>
                </div>
                <Link
                  href={fitmentCheckHref}
                  className="btn-primary btn-block mt-4 whitespace-normal py-2"
                >
                  Request VIN fitment check
                  <MessageSquarePlus
                    className="h-4 w-4 flex-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/vin-decoder"
                  className="mt-3 inline-block text-[13px] font-medium text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                >
                  Not sure it fits? Decode your VIN
                </Link>
              </div>

              <div className="rounded-xl bg-gray-950 p-5 text-white">
                <p className="eyebrow !text-white/60">Need more context?</p>
                <h2 className="mt-2 text-lg font-bold leading-snug">
                  Not sure between OEM, aftermarket, or used?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Tell us your budget, vehicle details, and repair goal. We will
                  help you choose the most suitable option before you buy.
                </p>
                <Link
                  href={fitmentCheckHref}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-gray-200"
                >
                  Get buying guidance
                </Link>
              </div>
            </aside>

            <div className="min-w-0 space-y-10">
              {categories.map(category => (
                <div key={category}>
                  <div className="mb-4 flex items-center gap-2.5">
                    <Truck
                      className="h-5 w-5 flex-none text-gray-500"
                      aria-hidden="true"
                    />
                    <h2 className="text-xl font-bold text-ink">{category}</h2>
                  </div>
                  <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {faqItems
                      .filter(item => item.category === category)
                      .map(item => (
                        <div key={item.id}>
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === item.id ? null : item.id
                              )
                            }
                            aria-expanded={expandedId === item.id}
                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:px-5"
                          >
                            <h3 className="font-sans text-[15px] font-semibold leading-snug tracking-normal text-ink sm:text-base">
                              {item.question}
                            </h3>
                            <ChevronDown
                              size={20}
                              className={`flex-none text-gray-500 transition-transform duration-300 ${
                                expandedId === item.id ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {expandedId === item.id && (
                            <div className="bg-gray-50 px-4 pb-5 pt-1 sm:px-5">
                              <p className="max-w-3xl text-[15px] leading-relaxed text-gray-700">
                                {item.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="border-t border-gray-200 bg-gray-50">
          <div className="container grid gap-6 py-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-ink">Still have a question?</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-700 sm:text-base">
                If your question is about a specific order, a custom sourcing
                request, or something not covered here, the fastest route is to
                contact us directly.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="btn-primary">
                Contact support
              </Link>
              <Link href={listingRequestHref} className="btn-secondary">
                Request a part
              </Link>
            </div>
            <RelatedLinks
              className="lg:col-span-2"
              links={[
                { href: "/help", label: "Help Center" },
                { href: "/shipping", label: "Shipping Info" },
                { href: "/returns", label: "Returns" },
                { href: "/blog", label: "Blog" },
              ]}
            />
          </div>
        </section>
      </div>
    </>
  );
}
