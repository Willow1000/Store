export default function Returns() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Returns & Refunds</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">30-Day Return Policy</h2>
            <p className="text-gray-600">We want you to be completely satisfied with your purchase. If you're not happy, we offer hassle-free returns within 30 days of delivery.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Return Eligibility</h2>
            <p className="text-gray-600 mb-4">Items must meet the following conditions:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Purchased within the last 30 days</li>
              <li>Unused and in original condition</li>
              <li>With original packaging and tags</li>
              <li>With proof of purchase (receipt or order number)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How to Return an Item</h2>
            <ol className="space-y-3 text-gray-600">
              <li><span className="font-semibold">1. Request Return:</span> Log in to your account and initiate a return from your order history</li>
              <li><span className="font-semibold">2. Get Return Label:</span> We'll provide a free prepaid return shipping label</li>
              <li><span className="font-semibold">3. Ship It Back:</span> Pack the item securely and drop it off using the provided label</li>
              <li><span className="font-semibold">4. Get Refunded:</span> Once we receive and inspect your return, we'll process your refund</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Refund Timeline</h2>
            <p className="text-gray-600 mb-4">Refunds are processed as follows:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Processing: 5-7 business days after receiving your return</li>
              <li>Credit to Account: 3-5 additional business days</li>
              <li>Credit Card Refunds: May take 1-2 billing cycles to appear</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Exclusions</h2>
            <p className="text-gray-600 mb-4">The following items cannot be returned:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Used or damaged items</li>
              <li>Items without original packaging</li>
              <li>Custom or personalized products</li>
              <li>Digital products or software</li>
              <li>Items purchased as final sale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Defective or Damaged Items</h2>
            <p className="text-gray-600">If you receive a defective or damaged item, <a href="/contact" className="text-blue-600 hover:underline">contact us</a> immediately with photos. We'll arrange a replacement or full refund right away.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
