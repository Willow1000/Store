import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const t = (_key: string, fallback: string) => fallback;

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  // Sourcing
  {
    id: 'source-1',
    category: 'Sourcing',
    question: 'How do you source your auto parts?',
    answer: 'We source our parts from multiple trusted sources including certified tow stations, written-off vehicles from licensed salvage facilities, and authorized distributors. All parts are inspected for quality and functionality. Some high-demand parts are also sourced from overseas partners through our established supply chain networks to ensure availability.',
  },
  {
    id: 'source-2',
    category: 'Sourcing',
    question: 'Are all parts inspected before shipping?',
    answer: 'Yes, every part that leaves our warehouse goes through a rigorous quality control process. Our technicians inspect for functionality, wear, and alignment. Only parts that meet our quality standards are listed and shipped to customers.',
  },
  {
    id: 'source-3',
    category: 'Sourcing',
    question: 'Do you source parts from overseas?',
    answer: 'Yes, for certain high-demand components and parts with longer lead times, we source from overseas partners. These parts maintain the same quality standards as domestic sources and are subject to the same inspection process upon arrival.',
  },

  // Operations
  {
    id: 'ops-1',
    category: 'Operations',
    question: 'Where do you operate?',
    answer: 'MotorVault currently operates in the United States, Switzerland, Poland, Finland, and the United Arab Emirates. We maintain warehouses and distribution centers in each region to ensure fast and reliable delivery to our customers.',
  },
  {
    id: 'ops-2',
    category: 'Operations',
    question: 'How does the ordering process work?',
    answer: 'Simply browse our catalog, add items to your cart, and proceed to checkout. You\'ll provide your shipping address and payment information. Once your order is confirmed, we immediately process it and prepare your parts for shipment.',
  },
  {
    id: 'ops-3',
    category: 'Operations',
    question: 'How long does it take to process an order?',
    answer: 'Most orders are processed within 24 hours. Depending on your location and part availability, items are picked, inspected, packaged, and handed off to our shipping partner. You\'ll receive tracking information via email once your order ships.',
  },

  // Shipping
  {
    id: 'ship-1',
    category: 'Shipping & Delivery',
    question: 'How are parts shipped?',
    answer: 'We partner with trusted shipping companies to deliver your order safely. All parts are carefully packaged to prevent damage during transit. Once your order is handed to the shipping company, they become responsible for delivery and will contact you directly with tracking details.',
  },
  {
    id: 'ship-2',
    category: 'Shipping & Delivery',
    question: 'Will the shipping company contact me?',
    answer: 'Yes, your shipping carrier will contact you directly regarding delivery. They may call, email, or text you with estimated delivery windows, tracking updates, and any delivery instructions. Make sure your contact information is correct during checkout.',
  },
  {
    id: 'ship-3',
    category: 'Shipping & Delivery',
    question: 'How much does shipping cost?',
    answer: 'Shipping costs vary based on the weight of your order, destination, and shipping method selected. You\'ll see the exact shipping cost at checkout before you complete your purchase. Orders over $50 qualify for free standard shipping in select regions.',
  },
  {
    id: 'ship-4',
    category: 'Shipping & Delivery',
    question: 'Do you offer express shipping?',
    answer: 'Yes, we offer multiple shipping options including standard, expedited, and overnight delivery for most locations. Select your preferred shipping method at checkout to see delivery timeframes and costs.',
  },
  {
    id: 'ship-5',
    category: 'Shipping & Delivery',
    question: 'What if my part arrives damaged?',
    answer: 'If your part arrives damaged, contact us immediately with photos of the damage and packaging. We\'ll file a claim with the shipping company and either replace the part or issue a refund. Damaged parts should not be installed.',
  },

  // Returns & Warranty
  {
    id: 'return-1',
    category: 'Returns & Warranty',
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return window for most parts. Items must be unused, in original packaging, and in resalable condition. Submit a return request through your account, and we\'ll provide a prepaid shipping label. Refunds are processed within 5-7 business days of receipt.',
  },
  {
    id: 'return-2',
    category: 'Returns & Warranty',
    question: 'Do your parts come with a warranty?',
    answer: 'Many of our parts come with manufacturer or seller warranties ranging from 30 days to 1 year, depending on the part. Check the product listing for specific warranty details. We stand behind the quality of all our parts and offer satisfaction guarantees.',
  },
  {
    id: 'return-3',
    category: 'Returns & Warranty',
    question: 'Can I return a part if I changed my mind?',
    answer: 'Yes, if the part is unused and in original condition, you can return it within 30 days for a full refund (minus original shipping). Parts that have been installed or used cannot be returned.',
  },

  // Products
  {
    id: 'prod-1',
    category: 'Products',
    question: 'Are the parts OEM or aftermarket?',
    answer: 'We offer both OEM (Original Equipment Manufacturer) and high-quality aftermarket parts. Product listings clearly indicate the type and source. OEM parts provide exact fit and factory specifications, while aftermarket options often offer cost savings.',
  },
  {
    id: 'prod-2',
    category: 'Products',
    question: 'How do I know if a part fits my vehicle?',
    answer: 'Each listing includes detailed compatibility information including vehicle make, model, year, and VIN compatibility. You can filter by your vehicle details or contact our support team with your vehicle information for personalized assistance.',
  },
  {
    id: 'prod-3',
    category: 'Products',
    question: 'What if the part I received doesn\'t fit my car?',
    answer: 'If a part doesn\'t fit due to a compatibility issue on our end, we\'ll arrange a replacement or refund at no cost. Contact us with your vehicle details and photos, and we\'ll resolve the issue quickly.',
  },

  // Account & Orders
  {
    id: 'acc-1',
    category: 'Account & Orders',
    question: 'How do I track my order?',
    answer: 'Once your order ships, you\'ll receive an email with a tracking number and carrier information. Use this number on the carrier\'s website to track your package in real-time. You can also view your order status anytime in your account dashboard.',
  },
  {
    id: 'acc-2',
    category: 'Account & Orders',
    question: 'Can I cancel or modify my order?',
    answer: 'If you contact us within 2 hours of placing your order, we can usually cancel or modify it before it\'s processed. After processing begins, modifications aren\'t possible, but returns are available within 30 days of receipt.',
  },
  {
    id: 'acc-3',
    category: 'Account & Orders',
    question: 'Do I need an account to make a purchase?',
    answer: 'Yes, creating an account allows you to track orders, save payment methods, maintain a wishlist, and receive personalized recommendations. Account creation is quick and secure.',
  },

  // Payment
  {
    id: 'pay-1',
    category: 'Payment & Security',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), digital wallets, and bank transfers where available. All payments are processed securely with industry-standard encryption.',
  },
  {
    id: 'pay-2',
    category: 'Payment & Security',
    question: 'Is my payment information safe?',
    answer: 'Absolutely. We use PCI-compliant payment processing and SSL encryption to protect your financial information. Your payment details are never stored on our servers; they\'re processed by secure third-party providers.',
  },
];

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const categories = Array.from(new Set(faqItems.map((item) => item.category)));

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <SEOHead
        title="FAQ - MotorVault Auto Parts Help & Support"
        description="Frequently asked questions about MotorVault. Learn about sourcing, shipping, returns, and warranty policies."
        keywords={['auto parts FAQ', 'shipping help', 'returns', 'warranty', 'motor parts support', 'customer service']}
        canonical="https://motorvault.com/faq"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600">
            Find answers to common questions about MotorVault's sourcing, operations, shipping, and more.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-blue-600">
                {category}
              </h2>
              <div className="space-y-4">
                {faqItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-600 transition-colors"
                    >
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                        <ChevronDown
                          size={24}
                          className={`text-blue-600 flex-shrink-0 transition-transform duration-300 ${
                            expandedId === item.id ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>

                      {expandedId === item.id && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-blue-50 rounded-lg p-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Didn't find your answer?</h2>
          <p className="text-gray-700 mb-6">
            Our customer support team is here to help. Contact us through our support page or email us directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/contact"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Contact Support
            </a>
            <a
              href="/help"
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors text-center"
            >
              View Help Center
            </a>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
