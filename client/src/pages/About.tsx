import { SEOHead } from '@/components/SEOHead';
import { Link } from 'wouter';
import { ArrowRight, Truck, Shield, Users, Zap } from 'lucide-react';

export default function About() {
  return (
    <>
      <SEOHead
        title="About MotorVault - Quality Automotive Parts & Accessories"
        description="Learn about MotorVault, your trusted source for automotive parts and accessories. Discover our mission, values, and commitment to quality."
        url="/about"
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">About MotorVault</h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8">Your trusted partner for quality automotive parts and accessories worldwide</p>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16 md:py-20">
          {/* Our Mission */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">Our Mission</h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
              At MotorVault, we're committed to providing automotive enthusiasts, mechanics, and everyday drivers with access to high-quality parts and accessories. Our mission is to make vehicle maintenance and upgrades accessible, affordable, and hassle-free for everyone.
            </p>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              We believe in transparency, reliability, and customer satisfaction. Every product in our catalog is carefully curated to meet stringent quality standards, ensuring you get the best value for your investment.
            </p>
          </div>

          {/* Why Choose Us */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 text-gray-900">Why Choose MotorVault</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {[
                {
                  icon: Shield,
                  title: 'Quality Assurance',
                  description: 'Every product undergoes rigorous quality checks to ensure it meets industry standards.'
                },
                {
                  icon: Truck,
                  title: 'Fast & Reliable Shipping',
                  description: 'We partner with trusted carriers to deliver your parts quickly and safely to your door.'
                },
                {
                  icon: Zap,
                  title: 'Competitive Pricing',
                  description: 'Get the best prices on automotive parts without compromising on quality.'
                },
                {
                  icon: Users,
                  title: 'Expert Support',
                  description: 'Our knowledgeable team is ready to help you find the perfect parts for your vehicle.'
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="bg-gray-50 p-6 sm:p-8 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                    <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-sm sm:text-base text-gray-700">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Our Story */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">Our Story</h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
              MotorVault was founded on the principle that finding quality automotive parts shouldn't be complicated. We recognized the gap in the market—vehicle owners and mechanics needed a reliable, one-stop shop for everything from routine maintenance parts to specialty components.
            </p>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
              Today, we serve thousands of customers globally, offering an extensive catalog of OEM and aftermarket parts from trusted brands. Our team works tirelessly to expand our inventory, improve our services, and maintain the highest standards of customer care.
            </p>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              Whether you're a professional mechanic, a DIY enthusiast, or simply looking to maintain your vehicle, MotorVault is here to support you every step of the way.
            </p>
          </div>

          {/* Values */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 text-gray-900">Our Core Values</h2>
            <ul className="space-y-4">
              {[
                'Quality: We never compromise on the quality of our products',
                'Integrity: We believe in honest pricing and transparent communication',
                'Customer Focus: Your satisfaction is our top priority',
                'Innovation: We continuously improve our services and platform',
                'Reliability: We deliver on our promises, every single time'
              ].map((value, idx) => (
                <li key={idx} className="flex items-start gap-3 sm:gap-4">
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-base sm:text-lg text-gray-700">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 sm:p-10 md:p-12 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to experience the MotorVault difference?</h2>
            <p className="text-base sm:text-lg mb-6 opacity-90">Browse our extensive catalog and find the perfect parts for your vehicle.</p>
            <Link href="/products">
              <a className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-gray-100 transition-colors">
                Browse Products
                <ArrowRight className="w-5 h-5" />
              </a>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
