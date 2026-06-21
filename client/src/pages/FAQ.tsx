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
    id: 'sourcing-1',
    category: 'Sourcing and authenticity',
    question: 'Are you the manufacturer or just a trading company?',
    answer:
      'MotorVault is a sourcing and retail platform rather than a manufacturer. That means we focus on finding the right parts, verifying what we list, and supporting customers after purchase. When a part is manufactured by a third party, we make that clear whenever possible so customers know who produced it and who is responsible for the original product specification.',
  },
  {
    id: 'sourcing-2',
    category: 'Sourcing and authenticity',
    question: 'What similar auto parts or vehicle platforms do you supply regularly?',
    answer:
      'We regularly work with European car and light-commercial parts requests, especially common wear items, replacement components, and platform-specific parts where fitment matters. If you need a particular vehicle platform, share the make, model, year, and part number and we will tell you whether it is something we can source consistently.',
  },
  {
    id: 'sourcing-3',
    category: 'Sourcing and authenticity',
    question: 'Where do your parts come from?',
    answer:
      'We source from trusted vendors and suppliers, including individuals when appropriate, plus other verified supply channels depending on the item. We mainly operate within Europe, but we are also open to sourcing from other regions when the part quality, availability, and delivery timeline make sense.',
  },
  {
    id: 'sourcing-4',
    category: 'Sourcing and authenticity',
    question: 'Are the parts genuine, OEM, or aftermarket?',
    answer:
      'We may list genuine, OEM, or high-quality aftermarket parts depending on what is available and what best fits the customer need. Product listings should state the type clearly, and if something is uncertain we recommend contacting us before ordering so we can confirm the details.',
  },
  {
    id: 'sourcing-5',
    category: 'Sourcing and authenticity',
    question: 'How do I verify authenticity and quality before I buy?',
    answer:
      'Check the listing for the origin, specifications, and any certification details we provide, then contact us if you want clarification on fitment or supplier background. We aim to share enough information for you to compare options confidently before placing an order.',
  },
  {
    id: 'quality-1',
    category: 'Quality and inspection',
    question: 'How do you control material quality and consistency?',
    answer:
      'We control quality by combining supplier screening, inspection of the part and packaging, review of the listed specifications, and follow-up checks for repeat or multi-unit sourcing requests. When available, we also track identifying details so we can keep batch or part matching consistent for future orders.',
  },
  {
    id: 'quality-2',
    category: 'Quality and inspection',
    question: 'Do you inspect parts before selling them?',
    answer:
      'Yes. Parts are scrutinized by our team before they are listed. The exact review can vary by part type, but the goal is always the same: confirm the item matches the listing, meets our quality expectations, and is suitable for sale.',
  },
  {
    id: 'quality-3',
    category: 'Quality and inspection',
    question: 'What manufacturing process and materials do you use for these parts?',
    answer:
      'That depends on the specific manufacturer or supplier behind the item. For some products we can provide material or construction details directly in the listing, and for others we will share the available supplier information on request. If you need a particular durability or standards requirement, contact us before ordering and we will check whether the part matches it.',
  },
  {
    id: 'operations-1',
    category: 'Orders and operations',
    question: 'What are your minimum order quantity and lead times?',
    answer:
      'MOQ and lead times vary by part and supplier. Some items can be ordered individually, while others may require a minimum quantity or a short preparation window before dispatch. When you enquire, we will confirm the relevant MOQ, typical processing time, and any factors that could delay delivery.',
  },
  {
    id: 'operations-4',
    category: 'Orders and operations',
    question: 'How long will delivery take?',
    answer:
      'Delivery time depends on stock, packing requirements, destination country, customs handling, and the carrier option used. We provide an estimate before you pay whenever possible and share tracking details once the parcel is handed over.',
  },
  {
    id: 'operations-2',
    category: 'Orders and operations',
    question: 'How fast can you process and ship orders once confirmed?',
    answer:
      'Once an order is confirmed, we process it as quickly as the item type and destination allow. Shipping speed depends on stock availability, packing requirements, carrier options, and destination country. If timing is urgent, mention that in your enquiry and we will let you know the fastest realistic option.',
  },
  {
    id: 'operations-3',
    category: 'Orders and operations',
    question: 'Do you provide estimated delivery times and tracking?',
    answer:
      'Yes. We provide estimated delivery guidance where possible and share tracking details once an order has been handed to the carrier or shipping partner. Delivery time can vary by region, customs handling, and shipping service selected.',
  },
  {
    id: 'shipping-1',
    category: 'Shipping and export support',
    question: 'What export documents and shipping support can you provide?',
    answer:
      'Where relevant, we can support commercial invoices, packing lists, origin documentation, label coordination, and shipment handover details. The exact documents depend on the order and trade setup, so we recommend confirming what you need before checkout or before we finalize the order.',
  },
  {
    id: 'shipping-2',
    category: 'Shipping and export support',
    question: 'Do you ship to my country or region?',
    answer:
      'We mainly serve European customers, but we are open to other regions when logistics and customs rules allow it. If you are outside Europe, contact us with your country and the part you need, and we will confirm whether we can ship there.',
  },
  {
    id: 'shipping-3',
    category: 'Shipping and export support',
    question: 'Are there customs fees, taxes, VAT, or other charges?',
    answer:
      'Additional charges may apply depending on the destination, local import rules, and the shipping term used. We aim to be clear about pricing upfront, but customers should always check whether VAT, customs, duties, or local handling fees may be charged by their country or carrier.',
  },
  {
    id: 'shipping-4',
    category: 'Shipping and export support',
    question: 'What export documents and shipping support can you provide?',
    answer:
      'Where relevant, we can support commercial invoices, packing lists, origin details, label coordination, and shipment handover information. The exact documents depend on the order and trade setup, so we recommend confirming what you need before checkout or before finalizing the order.',
  },
  {
    id: 'payments-1',
    category: 'Pricing and payment',
    question: 'What payment terms do you accept, especially for first orders?',
    answer:
      'Accepted payment methods can depend on order size, destination, and risk profile. For first orders, we may request standard upfront payment or a deposit before fulfillment, while repeat customers may qualify for different terms. Please contact us if you need to discuss payment arrangements for a specific order.',
  },
  {
    id: 'payments-2',
    category: 'Pricing and payment',
    question: 'Are your prices final?',
    answer:
      'Not always. Final cost can be affected by shipping, tax, VAT, customs, packaging, and any special handling needed for the part. We recommend confirming the full landed cost before paying, especially for international orders.',
  },
  {
    id: 'payments-3',
    category: 'Pricing and payment',
    question: 'What payment terms do you accept, especially for first orders?',
    answer:
      'Payment terms depend on the order and the risk profile of the request. For first orders, we may require upfront payment or a deposit before fulfillment. For repeat customers or larger supply relationships, we can discuss alternative arrangements case by case.',
  },
  {
    id: 'after-sales-1',
    category: 'After-sales support',
    question: 'How do you handle quality problems, shortages, or fitment issues after delivery?',
    answer:
      'If you receive a wrong part, short shipment, damaged item, or a part that appears to fail inspection after delivery, contact us right away with your order number and photos if available. We will review the claim and help resolve it through replacement, return, or another appropriate remedy based on the issue.',
  },
  {
    id: 'after-sales-2',
    category: 'After-sales support',
    question: 'What warranties or guarantees do you offer on the parts?',
    answer:
      'Warranty coverage depends on the part and the source, and the exact duration is typically shown on the listing or confirmed before purchase. We will explain what is covered, what can void the warranty, and how to start a claim if a replacement is needed.',
  },
  {
    id: 'after-sales-3',
    category: 'After-sales support',
    question: 'What happens if I receive the wrong part?',
    answer:
      'If we sent the wrong item, contact us as soon as possible so we can verify the mistake and arrange the next step. We will work to correct the order and explain whether a return label, exchange, or other resolution applies.',
  },
  {
    id: 'after-sales-4',
    category: 'After-sales support',
    question: 'What is your return policy?',
    answer:
      'We have a return process for eligible items that do not meet expectations or arrive with an issue. Return eligibility can depend on the part condition, packaging, and reason for the return, so please contact us quickly after receipt if something is not right.',
  },
  {
    id: 'after-sales-5',
    category: 'After-sales support',
    question: 'What warranties or guarantees do you offer on the parts?',
    answer:
      'Warranty coverage depends on the part and the source, and the exact duration is typically shown on the listing or confirmed before purchase. We explain what is covered, what can void the warranty, and how to start a claim if a replacement is needed.',
  },
  {
    id: 'listing-1',
    category: 'Request a part',
    question: 'Can I request that a specific part be listed?',
    answer:
      'Yes. If you have a part you want us to source or list, use the Contact Us page and we will review the request. Include the part name, part number if you have it, the vehicle make/model/year, and any photos or notes that help us identify it accurately.',
  },
];

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

  return (
    <>
      <SEOHead
        title="FAQ - MotorVault Automotive Parts Help"
        description="Answers about sourcing, authenticity, quality checks, shipping, returns, warranties, and payment terms."
        keywords={['auto parts FAQ', 'sourcing', 'quality control', 'shipping', 'returns', 'warranty', 'contact support']}
        canonical="https://motorvault.com/faq"
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
                These answers cover how we source parts, how we inspect them, what support looks like after delivery, and what to expect when ordering internationally.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 text-blue-700" />
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Need a specific part listed?</h2>
                  <p className="mt-2 text-gray-700">
                    Send us the part name, vehicle details, and any part numbers. We will review the request and contact you about next steps.
                  </p>
                </div>
              </div>
              <Link href={listingRequestHref}>
                <a className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
                  Request via Contact Us
                  <MessageSquarePlus className="h-4 w-4" />
                </a>
              </Link>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-lg">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Need more context?</p>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black">If you want a specific part listed, we can review it.</h2>
                <p className="mt-3 max-w-3xl text-white/80 leading-relaxed">
                  Use the contact form and we’ll prefill a request for the part you want, including a subject and message that makes the request easy to review.
                </p>
              </div>
              <Link href={listingRequestHref}>
                <a className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-slate-100">
                  Request a part
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
