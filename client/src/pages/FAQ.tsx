import { useMemo, useState } from 'react';
import { ChevronDown, MessageSquarePlus, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'fitment-1',
    category: 'Fitment and part identification',
    question: 'Do I need to know a lot about cars before buying parts?',
    answer:
      'No. You can still order confidently if you share the key identifiers: VIN, make, model, year, engine, and the issue you are fixing. We use that information to help narrow fitment before checkout.',
  },
  {
    id: 'fitment-2',
    category: 'Fitment and part identification',
    question: "How do I find the right part if I don't know my exact model details?",
    answer:
      'Start with VIN and any part number on the old component. If you do not have a part number, send clear photos plus make/model/year. We can often identify the correct part path from that.',
  },
  {
    id: 'fitment-3',
    category: 'Fitment and part identification',
    question: 'How does VIN help with part matching?',
    answer:
      'VIN allows us to verify trim, engine family, production range, and compatibility notes that generic searches can miss. This reduces wrong-part risk significantly.',
  },
  {
    id: 'fitment-4',
    category: 'Fitment and part identification',
    question: 'Can I buy parts without VIN?',
    answer:
      'Yes, but VIN is strongly recommended for fitment-critical parts. Without VIN, provide make/model/year/engine code and part photos so we can still run the best possible compatibility check.',
  },
  {
    id: 'fitment-5',
    category: 'Fitment and part identification',
    question: 'How do I know a part will fit my vehicle?',
    answer:
      'Check compatibility notes on the listing, verify OEM/part numbers where available, and confirm with support before purchase for high-risk components. We recommend fitment confirmation before payment if anything is unclear.',
  },
  {
    id: 'quality-1',
    category: 'Quality and part options',
    question: "What's the difference between OEM and aftermarket parts?",
    answer:
      'OEM parts are built to original manufacturer specifications. Aftermarket parts are made by third-party brands and can vary by quality tier. We label part type in listings so you can choose based on budget and performance needs.',
  },
  {
    id: 'quality-2',
    category: 'Quality and part options',
    question: "What's the difference between premium and standard aftermarket parts?",
    answer:
      'Premium lines usually offer tighter tolerances, better materials, and stronger durability/warranty terms. Standard lines are more budget-focused. We recommend premium for safety-critical or high-labor replacements.',
  },
  {
    id: 'quality-3',
    category: 'Quality and part options',
    question: 'Should I buy used or refurbished auto parts?',
    answer:
      'Used or refurbished can be a smart value option for non-safety-critical components when condition is verified. For high-risk systems, choose carefully and prioritize tested units with clear provenance.',
  },
  {
    id: 'quality-4',
    category: 'Quality and part options',
    question: 'What parts should I avoid buying used?',
    answer:
      'Be cautious with safety-critical items such as brake friction materials, airbags/SRS components, heavily worn suspension items, and unknown-history electronics where failure risk is high. Choose verified quality sources for these categories.',
  },
  {
    id: 'pricing-1',
    category: 'Pricing, returns, and warranty',
    question: "What's a reasonable price for common replacement parts?",
    answer:
      'Compare by brand tier, warranty length, and fitment certainty, not just headline price. Extremely low prices can indicate lower quality, incomplete kits, or unknown sourcing.',
  },
  {
    id: 'pricing-2',
    category: 'Pricing, returns, and warranty',
    question: 'How can I avoid overpaying or being scammed on parts pricing?',
    answer:
      'Check part numbers, compare equivalent options, confirm what is included in the box, and verify return/warranty terms before purchase. Ask for fitment confirmation when uncertain.',
  },
  {
    id: 'pricing-3',
    category: 'Pricing, returns, and warranty',
    question: "Can I return parts that don't fit?",
    answer:
      'Eligible items can be returned under our returns policy. Fitment-related returns are easier when part numbers, VIN confirmation steps, and packaging are preserved. Review the return conditions before installation.',
  },
  {
    id: 'pricing-4',
    category: 'Pricing, returns, and warranty',
    question: 'Will changing parts affect my vehicle warranty?',
    answer:
      'It can, depending on part type, brand, and local warranty terms. For warranty-sensitive vehicles, confirm acceptable specifications with your service provider before ordering.',
  },
  {
    id: 'pricing-5',
    category: 'Pricing, returns, and warranty',
    question: 'How long will shipping take and will I get tracking?',
    answer:
      'Delivery time depends on stock status, destination, and carrier service. We provide shipping estimates and send tracking details once the parcel is dispatched.',
  },
  {
    id: 'diy-1',
    category: 'DIY vs professional installation',
    question: 'How do I decide between DIY installation and using a mechanic?',
    answer:
      'Use DIY for low-risk, tool-friendly jobs and choose professional installation for safety-critical, calibration-heavy, or labor-intensive parts. If unsure, ask a mechanic before ordering.',
  },
  {
    id: 'diy-2',
    category: 'DIY vs professional installation',
    question: 'What should I ask a mechanic before buying parts?',
    answer:
      'Ask for exact part numbers, whether OEM is required, which related seals/bolts/fluids must be replaced, labor estimate, and whether programming or calibration is needed after installation.',
  },
  {
    id: 'diy-3',
    category: 'DIY vs professional installation',
    question: 'What information do I need before buying transmission fluid or similar specification-sensitive items?',
    answer:
      'Use the exact specification from your manual or service data, including viscosity/standard approvals and fill capacity. Buying by vehicle year alone is not always enough for fluids.',
  },
  {
    id: 'listing-1',
    category: 'Request a part and support',
    question: 'Can I request that a specific part be listed?',
    answer:
      'Yes. If you have a part you want us to source or list, use the Contact Us page and we will review the request. Include the part name, part number if you have it, the vehicle make/model/year, and any photos or notes that help us identify it accurately.',
  },
  {
    id: 'listing-2',
    category: 'Request a part and support',
    question: 'Can your team help identify unknown parts?',
    answer:
      'Yes. Send clear photos, dimensions where possible, and vehicle details. If there is a stamped number on the part, include that too. This speeds up accurate identification.',
  },
  {
    id: 'listing-3',
    category: 'Request a part and support',
    question: 'Do I need a special license to buy any parts?',
    answer:
      'Most consumer replacement parts do not require a special license. Some regulated or hazardous items may have restrictions depending on local law. If uncertain, contact us before ordering.',
  },
];

function buildFitmentCheckHref() {
  const subject = 'VIN fitment check before purchase';
  const message =
    'Hello MotorVault team,\n\nPlease help me confirm fitment before I order.\n\nVehicle details:\n- VIN:\n- Make/Model/Year:\n- Engine/Trim:\n\nPart details:\n- Part name:\n- Part number (if known):\n- Photos (if available):\n\nThank you.';
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: '1',
  });
  return `/contact?${params.toString()}`;
}

function buildListingRequestHref() {
  const subject = 'Request to list a specific part';
  const message =
    'Hello MotorVault team,\n\nI would like to request that a specific part be listed on your platform.\n\nPart details:\n- Part name:\n- Vehicle make/model/year:\n- OEM or aftermarket preference:\n- Any part numbers or photos:\n\nThank you.';
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: '1',
  });
  return `/contact?${params.toString()}`;
}

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const categories = useMemo(() => Array.from(new Set(faqItems.map((item) => item.category))), []);
  const listingRequestHref = buildListingRequestHref();
  const fitmentCheckHref = buildFitmentCheckHref();

  return (
    <>
      <SEOHead
        pageType="faq"
        title="FAQ - MotorVault Automotive Parts Help"
        description="Answers about sourcing, authenticity, quality checks, shipping, returns, warranties, and payment terms."
        keywords={['auto parts FAQ', 'sourcing', 'quality control', 'shipping', 'returns', 'warranty', 'contact support']}
        canonical="https://motorvault.shop/faq"
        faqData={faqItems.map((item) => ({ question: item.question, answer: item.answer }))}
      />

      <div className="min-h-screen bg-background pt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700 mb-4">Help center</p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950">
                Frequently asked questions
              </h1>
              <p className="mt-5 max-w-3xl text-lg text-gray-700 leading-relaxed">
                We focus on the questions auto-parts buyers ask most: fitment, VIN checks, OEM vs aftermarket differences, return eligibility, pricing confidence, and when to DIY versus use a mechanic.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 text-blue-700" />
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Need help confirming fitment first?</h2>
                  <p className="mt-2 text-gray-700">
                    Send VIN plus part details and we will help you validate compatibility before checkout.
                  </p>
                </div>
              </div>
              <Link href={fitmentCheckHref}>
                <a className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
                  Request VIN fitment check
                  <MessageSquarePlus className="h-4 w-4" />
                </a>
              </Link>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-lg">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Need more context?</p>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black">Not sure between OEM, aftermarket, or used?</h2>
                <p className="mt-3 max-w-3xl text-white/80 leading-relaxed">
                  Tell us your budget, vehicle details, and repair goal. We will help you choose the most suitable option before you buy.
                </p>
              </div>
              <Link href={fitmentCheckHref}>
                <a className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-slate-100">
                  Get buying guidance
                </a>
              </Link>
            </div>
          </div>

          <div className="mt-14 space-y-12">
            {categories.map((category) => (
              <div key={category}>
                <div className="mb-6 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-700" />
                  <h2 className="text-2xl font-bold text-gray-950">{category}</h2>
                </div>
                <div className="space-y-4">
                  {faqItems
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-blue-300"
                      >
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                        >
                          <h3 className="text-lg font-semibold text-gray-950">{item.question}</h3>
                          <ChevronDown
                            size={22}
                            className={`flex-none text-blue-700 transition-transform duration-300 ${
                              expandedId === item.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {expandedId === item.id && (
                          <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
                            <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-6 rounded-3xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-950">Still have a question?</h2>
              <p className="mt-3 max-w-3xl text-gray-700 leading-relaxed">
                If your question is about a specific order, a custom sourcing request, or something not covered here, the fastest route is to contact us directly.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/contact">
                <a className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800">
                  Contact support
                </a>
              </Link>
              <Link href={listingRequestHref}>
                <a className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-50">
                  Request a part
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
