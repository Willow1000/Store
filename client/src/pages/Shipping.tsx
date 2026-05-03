export default function Shipping() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Shipping Information</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Shipping Rates & Delivery Times</h2>
            <p className="text-gray-600 mb-4">We offer multiple shipping options to meet your needs:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Standard Shipping</h3>
                <p className="text-sm text-gray-600">5-7 business days | $5.99 or Free on orders over $50</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Express Shipping</h3>
                <p className="text-sm text-gray-600">2-3 business days | $12.99</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Overnight Shipping</h3>
                <p className="text-sm text-gray-600">Next business day | $24.99</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Free Shipping</h3>
                <p className="text-sm text-gray-600">Available on select items</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">International Shipping</h2>
            <p className="text-gray-600">We currently ship to select countries. Delivery times and costs vary by location. Please add items to your cart to see available shipping options for your region.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Order Tracking</h2>
            <p className="text-gray-600">Once your order ships, you'll receive a tracking number via email. You can track your package in real-time through your order details page.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Shipping Restrictions</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Some items may have shipping restrictions due to weight, size, or regulations</li>
              <li>Hazardous materials cannot be shipped</li>
              <li>Orders to P.O. boxes are not available for all shipping methods</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
            <p className="text-gray-600">
              Visit our <a href="/help" className="text-blue-600 hover:underline">Help Center</a> or <a href="/contact" className="text-blue-600 hover:underline">contact us</a> for shipping questions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
