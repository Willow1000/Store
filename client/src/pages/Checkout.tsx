import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ChevronRight, Lock, Truck, AlertCircle, Check, 
  CreditCard, Apple, Globe, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { openPaystackModal } from '@/lib/paystack';

interface CartItem {
  title: string;
  price: string;
  image: string;
  quantity: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface PaymentMethod {
  id: 'paystack' | 'apple' | 'google' | 'card';
  name: string;
  icon: React.ReactNode;
  description: string;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please sign in to checkout');
      openAuthModal('login', 'checkout');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [isAuthenticated, navigate, openAuthModal]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<'paystack' | 'apple' | 'google' | 'card'>('paystack');
  const [showCardForm, setShowCardForm] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'NG',
  });

  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvc: '',
  });

  const [showCvc, setShowCvc] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        setCartItems(items);
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, []);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
    return sum + price * item.quantity;
  }, 0);

  const shipping = subtotal > 50 ? 0 : 10;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'paystack',
      name: 'Paystack',
      icon: <Globe className="w-6 h-6" />,
      description: 'Secure online payment'
    },
    {
      id: 'apple',
      name: 'Apple Pay',
      icon: <Apple className="w-6 h-6" />,
      description: 'Fast and secure'
    },
    {
      id: 'google',
      name: 'Google Pay',
      icon: <Globe className="w-6 h-6 text-blue-500" />,
      description: 'Quick checkout'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Visa, Mastercard'
    }
  ];

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateShipping = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
      toast.error('Please fill in your complete address');
      return false;
    }
    return true;
  };

  const handlePaystackPayment = async () => {
    setIsProcessing(true);
    try {
      await openPaystackModal({
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: formData.email,
        amount: total,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phone,
        onSuccess: (reference) => {
          handlePaymentSuccess('paystack', reference);
        },
        onClose: () => {
          setIsProcessing(false);
          toast.error('Payment cancelled');
        },
      });
    } catch (error) {
      setIsProcessing(false);
      toast.error('Payment failed. Please try again.');
      console.error('Paystack error:', error);
    }
  };

  const handleApplePay = async () => {
    setIsProcessing(true);
    try {
      toast.info('Apple Pay integration coming soon');
      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      toast.error('Apple Pay payment failed');
    }
  };

  const handleGooglePay = async () => {
    setIsProcessing(true);
    try {
      toast.info('Google Pay integration coming soon');
      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      toast.error('Google Pay payment failed');
    }
  };

  const handleCardPayment = async () => {
    if (!cardData.cardNumber || !cardData.cardName || !cardData.expiry || !cardData.cvc) {
      toast.error('Please fill in all card details');
      return;
    }

    setIsProcessing(true);
    try {
      toast.info('Card payment processing - Demo Mode');
      // Simulate card payment
      setTimeout(() => {
        handlePaymentSuccess('card', `CARD-${Date.now()}`);
      }, 2000);
    } catch (error) {
      setIsProcessing(false);
      toast.error('Card payment failed');
    }
  };

  const handlePaymentSuccess = (method: string, reference: string) => {
    setIsProcessing(false);
    
    // Clear cart
    localStorage.removeItem('cart');
    
    // Show success message
    toast.success('Order placed successfully!');
    
    // Redirect to orders page
    setTimeout(() => {
      navigate('/orders');
    }, 1500);
  };

  const handlePayment = async () => {
    if (!validateShipping()) {
      return;
    }

    switch (selectedPayment) {
      case 'paystack':
        await handlePaystackPayment();
        break;
      case 'apple':
        await handleApplePay();
        break;
      case 'google':
        await handleGooglePay();
        break;
      case 'card':
        await handleCardPayment();
        break;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-16">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-gray-900">Secure Checkout</h1>
          <p className="text-sm sm:text-base text-gray-600">Complete your purchase safely and quickly</p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Steps */}
            <div className="mb-8 flex items-center gap-2 md:gap-4 px-4 py-2 bg-white rounded-lg shadow-sm">
              {['Shipping', 'Payment', 'Review'].map((label, idx) => (
                <div key={label} className="flex items-center gap-2 md:gap-4 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all ${
                      idx < ['Shipping', 'Payment', 'Review'].indexOf(['shipping', 'payment', 'review'][['shipping', 'payment', 'review'].indexOf(step)])
                        ? 'bg-green-500 text-white'
                        : idx === ['shipping', 'payment', 'review'].indexOf(step)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {idx < ['shipping', 'payment', 'review'].indexOf(step) ? (
                      <Check size={20} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className="hidden md:inline text-sm font-semibold text-gray-700">{label}</span>
                </div>
              ))}
            </div>

            {/* Shipping Step */}
            {step === 'shipping' && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>
                
                <form className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleShippingChange}
                        placeholder="John"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleShippingChange}
                        placeholder="Doe"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleShippingChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleShippingChange}
                      placeholder="+234 800 000 0000"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleShippingChange}
                      placeholder="123 Main Street"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleShippingChange}
                        placeholder="Lagos"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleShippingChange}
                        placeholder="Lagos"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleShippingChange}
                        placeholder="000000"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="NG">Nigeria</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => validateShipping() && setStep('payment')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    Continue to Payment
                    <ChevronRight size={20} />
                  </button>
                </form>
              </div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="space-y-6">
                {/* Payment Methods */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {paymentMethods.map(method => (
                      <button
                        key={method.id}
                        onClick={() => {
                          setSelectedPayment(method.id);
                          if (method.id === 'card') {
                            setShowCardForm(true);
                          } else {
                            setShowCardForm(false);
                          }
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          selectedPayment === method.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {method.icon}
                          <h3 className="font-bold text-gray-900">{method.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Card Form */}
                  {selectedPayment === 'card' && (
                    <div className="mt-8 pt-8 border-t-2 border-gray-200 space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardData.cardNumber}
                          onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                          maxLength={19}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={cardData.cardName}
                          onChange={(e) => setCardData({ ...cardData, cardName: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardData.expiry}
                            onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                            maxLength={5}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">CVC</label>
                          <div className="relative">
                            <input
                              type={showCvc ? 'text' : 'password'}
                              placeholder="123"
                              value={cardData.cvc}
                              onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                              maxLength={4}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCvc(!showCvc)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showCvc ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Info */}
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                    <Lock className="text-blue-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Secure & Encrypted</p>
                      <p className="text-xs text-blue-700">Your payment information is encrypted and secure</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('shipping')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    Review Order
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold mb-6">Review Your Order</h2>

                  {/* Shipping Summary */}
                  <div className="pb-6 border-b-2 border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3">Shipping To</h3>
                    <p className="text-gray-700">
                      {formData.firstName} {formData.lastName}<br />
                      {formData.address}<br />
                      {formData.city}, {formData.state} {formData.zip}<br />
                      {formData.phone}
                    </p>
                  </div>

                  {/* Payment Summary */}
                  <div className="py-6 border-b-2 border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3">Payment Method</h3>
                    <p className="text-gray-700">
                      {paymentMethods.find(m => m.id === selectedPayment)?.name}
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="py-6">
                    <h3 className="font-bold text-gray-900 mb-3">Items ({cartItems.length})</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2">
                          <div>
                            <p className="font-semibold text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-bold text-gray-900">
                            ${(parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('payment')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    {isProcessing ? 'Processing...' : `Pay ₦${(total * 750).toFixed(0)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-lg font-bold mb-6 text-gray-900">Order Summary</h3>

              {/* Items */}
              <div className="space-y-3 mb-6 pb-6 border-b-2 border-gray-200 max-h-64 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <p className="text-gray-600 text-sm">No items in cart</p>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-12 w-12 rounded object-contain bg-gray-100 flex-shrink-0"
                          crossOrigin="anonymous"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 text-right flex-shrink-0">
                        ${(parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pb-6 border-b-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2 mt-6 text-sm text-gray-600">
                <div className="flex gap-2 items-start">
                  <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex gap-2 items-start">
                  <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>30-day return policy</span>
                </div>
                <div className="flex gap-2 items-start">
                  <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Secure encrypted payments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
