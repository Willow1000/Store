import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ChevronRight, Lock, Truck, AlertCircle, Check, 
  CreditCard, Apple, Globe, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { generateUUID } from '@/lib/paystack';
import { readCartFromStorage } from '@/lib/cart';
import { trpcClient } from '@/lib/trpc';
import { useSupabaseCart } from '@/hooks/useSupabaseCart';
import { supabase } from '@/lib/supabase';
import { getHighResImageUrl } from '@/lib/images';
import { calculateShipping } from '@shared/shipping';

const t = (_key: string, fallback: string) => fallback;

type StateOption = {
  value: string;
  label: string;
};

// USA States and Major Cities
const US_STATES_AND_CITIES: Record<string, { label: string; cities: string[] }> = {
  'AL': { label: 'Alabama', cities: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa'] },
  'AK': { label: 'Alaska', cities: ['Anchorage', 'Juneau', 'Fairbanks', 'Whitehorse', 'Ketchikan'] },
  'AZ': { label: 'Arizona', cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'] },
  'AR': { label: 'Arkansas', cities: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'] },
  'CA': { label: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Long Beach'] },
  'CO': { label: 'Colorado', cities: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood'] },
  'CT': { label: 'Connecticut', cities: ['Hartford', 'New Haven', 'Bridgeport', 'Waterbury', 'Stamford'] },
  'DE': { label: 'Delaware', cities: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'] },
  'FL': { label: 'Florida', cities: ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg'] },
  'GA': { label: 'Georgia', cities: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens'] },
  'HI': { label: 'Hawaii', cities: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Kaneohe'] },
  'ID': { label: 'Idaho', cities: ['Boise', 'Nampa', 'Pocatello', 'Idaho Falls', 'Coeur d\'Alene'] },
  'IL': { label: 'Illinois', cities: ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville'] },
  'IN': { label: 'Indiana', cities: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Bloomington'] },
  'IA': { label: 'Iowa', cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City'] },
  'KS': { label: 'Kansas', cities: ['Kansas City', 'Wichita', 'Topeka', 'Overland Park', 'Olathe'] },
  'KY': { label: 'Kentucky', cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'] },
  'LA': { label: 'Louisiana', cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles'] },
  'ME': { label: 'Maine', cities: ['Portland', 'Lewiston', 'Bangor', 'Augusta', 'Waterville'] },
  'MD': { label: 'Maryland', cities: ['Baltimore', 'Frederick', 'Gaithersburg', 'Bowie', 'College Park'] },
  'MA': { label: 'Massachusetts', cities: ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge'] },
  'MI': { label: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor'] },
  'MN': { label: 'Minnesota', cities: ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington'] },
  'MS': { label: 'Mississippi', cities: ['Jackson', 'Gulfport', 'Biloxi', 'Hattiesburg', 'Greenville'] },
  'MO': { label: 'Missouri', cities: ['Kansas City', 'St. Louis', 'Springfield', 'Independence', 'Columbia'] },
  'MT': { label: 'Montana', cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Helena'] },
  'NE': { label: 'Nebraska', cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'] },
  'NV': { label: 'Nevada', cities: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'] },
  'NH': { label: 'New Hampshire', cities: ['Manchester', 'Nashua', 'Concord', 'Rochester', 'Dover'] },
  'NJ': { label: 'New Jersey', cities: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton'] },
  'NM': { label: 'New Mexico', cities: ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Rio Rancho', 'Roswell'] },
  'NY': { label: 'New York', cities: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'] },
  'NC': { label: 'North Carolina', cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'] },
  'ND': { label: 'North Dakota', cities: ['Bismarck', 'Fargo', 'Grand Forks', 'Minot', 'Williston'] },
  'OH': { label: 'Ohio', cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'] },
  'OK': { label: 'Oklahoma', cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton'] },
  'OR': { label: 'Oregon', cities: ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro'] },
  'PA': { label: 'Pennsylvania', cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'] },
  'RI': { label: 'Rhode Island', cities: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence'] },
  'SC': { label: 'South Carolina', cities: ['Charleston', 'Columbia', 'Greenville', 'Summerville', 'Rock Hill'] },
  'SD': { label: 'South Dakota', cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'] },
  'TN': { label: 'Tennessee', cities: ['Memphis', 'Nashville', 'Knoxville', 'Chattanooga', 'Clarksville'] },
  'TX': { label: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'] },
  'UT': { label: 'Utah', cities: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'] },
  'VT': { label: 'Vermont', cities: ['Burlington', 'Rutland', 'Barre', 'Montpelier', 'St. Johnsbury'] },
  'VA': { label: 'Virginia', cities: ['Virginia Beach', 'Richmond', 'Arlington', 'Alexandria', 'Roanoke'] },
  'WA': { label: 'Washington', cities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'] },
  'WV': { label: 'West Virginia', cities: ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling'] },
  'WI': { label: 'Wisconsin', cities: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine'] },
  'WY': { label: 'Wyoming', cities: ['Cheyenne', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan'] },
};

const getStateOptions = (country: string): StateOption[] => {
  if (country !== 'US') {
    return [{ value: '', label: 'Select state' }];
  }
  return [
    { value: '', label: 'Select state' },
    ...Object.entries(US_STATES_AND_CITIES).map(([code, data]) => ({
      value: code,
      label: data.label,
    })),
  ];
};

const getCityOptions = (country: string, state: string): string[] => {
  if (country !== 'US' || !state) {
    return [];
  }
  return US_STATES_AND_CITIES[state]?.cities || [];
};

const getStateLabel = (_country: string) => 'State';
const getPostalCodeLabel = (_country: string) => 'Postal Code';
const getPhoneFormat = (_country: string) => '(###) ### ####';

interface CartItem {
  product_id: string;
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
  id: 'visa' | 'mastercard' | 'applePay';
  name: string;
  icon: React.ReactNode;
  description: string;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading, sessionRestored } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { items: supabaseCartItems, clearCart: clearSupabaseCart } = useSupabaseCart(user?.id || null);

  // Require authentication for checkout
  useEffect(() => {
    if (!sessionRestored) return; // Wait for session to be restored
    
    if (!isAuthenticated) {
      toast.error('Please sign in to checkout');
      openAuthModal('login', 'checkout', {
        type: 'checkout',
        redirectTo: '/checkout',
      });
    }
  }, [isAuthenticated, sessionRestored, openAuthModal]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>(() => {
    try {
      const saved = localStorage.getItem('checkout-step');
      return (saved as 'shipping' | 'payment' | 'review') || 'shipping';
    } catch {
      return 'shipping';
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<'visa' | 'mastercard' | 'applePay'>('visa');

  const [formData, setFormData] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem('checkout-form-data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return {
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    };
  });

  const [setAsDefaultAddress, setSetAsDefaultAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Persist formData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('checkout-form-data', JSON.stringify(formData));
    } catch {
      console.warn('[Checkout] Failed to persist form data');
    }
  }, [formData]);

  // Persist checkout step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('checkout-step', step);
    } catch {
      console.warn('[Checkout] Failed to persist checkout step');
    }
  }, [step]);

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const composeAddressLine = (address: string, state: string) => `${address} | ${state}`;
  const parseAddressLine = (line: string | null) => {
    const raw = line || '';
    const [addressPart, statePart] = raw.split(' | ');
    return {
      address: (addressPart || '').trim(),
      state: (statePart || '').trim(),
    };
  };

  // Load cart from the appropriate source
  useEffect(() => {
    if (isAuthenticated) {
      const mapped = supabaseCartItems.map((item) => ({
        product_id: item.product_id,
        title: item.product?.title || 'Product',
        price: `$ ${Number(item.product?.price || 0).toFixed(2)}`,
        image: item.product?.cover_image_url || '',
        quantity: item.quantity,
      }));
      setCartItems(mapped);
      return;
    }

    const savedCart = localStorage.getItem('cart');
    const items = readCartFromStorage(savedCart).map((item) => ({
      product_id: item.productId || String(item.productIndex),
      title: item.title,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    }));
    setCartItems(items);
  }, [isAuthenticated, supabaseCartItems]);

  // Keep shipping form synced when user becomes available after refresh.
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      firstName: prev.firstName || user.name?.split(' ')[0] || '',
      lastName: prev.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: prev.email || user.email || '',
    }));
  }, [user?.id]); // Only depend on user.id to avoid frequent updates

  // Prefill shipping fields from saved default address.
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!isAuthenticated || !user?.id) return;

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Checkout] Failed to load default address:', error);
        return;
      }

      if (!data) return;

      const parsed = parseAddressLine(data.address_line);
      setFormData((prev) => ({
        ...prev,
        address: prev.address || parsed.address,
        state: prev.state || parsed.state,
        city: prev.city || data.city || '',
        zip: prev.zip || data.postal_code || '',
        country: prev.country || data.country || 'US',
      }));
    };

    loadDefaultAddress();
  }, [isAuthenticated, user?.id]);

  // Validate city when state changes
  useEffect(() => {
    if (!formData.state || formData.country !== 'US') {
      return;
    }
    
    const validCities = getCityOptions(formData.country, formData.state);
    if (formData.city && !validCities.includes(formData.city)) {
      // City is not in the new state, clear it
      setFormData((prev) => ({
        ...prev,
        city: '',
      }));
    }
  }, [formData.state, formData.country]);

  // Calculate totals (all amounts in USD, rounded to 2 decimal places)
  const subtotal = Math.round(
    cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
      return sum + price * item.quantity;
    }, 0) * 100
  ) / 100;

  const shipping = calculateShipping(subtotal);
  const tax = Math.round(subtotal * 0.1 * 100) / 100; // Tax rounded to 2 decimal places
  const total = Math.round((subtotal + shipping + tax) * 100) / 100; // Ensure final total is precise

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'visa',
      name: 'Visa',
      icon: <img src="https://www.svgrepo.com/show/76111/visa-pay-logo.svg" alt="Visa" className="w-8 h-8 object-contain" />,
      description: 'Pay securely with your Visa card through Paystack'
    },
    {
      id: 'mastercard',
      name: 'Mastercard',
      icon: <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXnXkBmw2uSAI7UPnfI8ZWleOP_9jguz46rQ&s" alt="Mastercard" className="w-8 h-8 object-contain" />,
      description: 'Pay securely with your Mastercard through Paystack'
    },
    {
      id: 'applePay',
      name: 'Apple Pay',
      icon: <img src="https://cdn-icons-png.flaticon.com/512/5968/5968500.png" alt="Apple Pay" className="w-8 h-8 object-contain" />,
      description: 'Use Apple Pay on supported devices through Paystack'
    }
  ];

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    // Clear phone error when user starts typing
    if (formErrors.phone) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.phone;
        return updated;
      });
    }
  };

  const validateShipping = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (formData.email && !formData.email.includes('@')) errors.email = 'Please enter a valid email';
    if (!formData.phone) errors.phone = 'Phone number is required';
    if (!formData.address) errors.address = 'Street address is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.state) errors.state = 'State is required';
    if (!formData.zip) errors.zip = 'Zip code is required';

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix all errors before continuing');
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (!selectedPayment) {
      toast.error('Please select a payment method to continue');
      return false;
    }
    return true;
  };

  const saveDefaultAddressIfRequested = async () => {
    if (!setAsDefaultAddress) return true;
    if (!isAuthenticated || !user?.id) {
      toast.error('Please sign in to save a default address');
      return false;
    }

    setIsSavingAddress(true);
    try {
      const { error: unsetError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);

      if (unsetError) throw unsetError;

      const { error: insertError } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          country: formData.country,
          city: formData.city,
          address_line: composeAddressLine(formData.address, formData.state),
          postal_code: formData.zip,
          is_default: true,
        });

      if (insertError) throw insertError;

      toast.success('Default shipping address saved');
      return true;
    } catch (error) {
      console.error('[Checkout] Failed to save default address:', error);
      toast.error('Failed to save default address');
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!isAuthenticated || !user?.id) {
      openAuthModal('login', 'checkout', {
        type: 'checkout',
        redirectTo: '/checkout',
      });
      toast.error('Please sign in to continue');
      return;
    }

    if (!validateShipping()) return;

    const saved = await saveDefaultAddressIfRequested();
    if (!saved) return;

    setStep('payment');
  };

  const handlePaystackPayment = async () => {
    setIsProcessing(true);
    try {
      // Tutorial 2: Generate unique reference (Tutorial 3 UUID approach)
      const paymentReference = generateUUID();

      // Tutorial 2: Initialize transaction on server first
      const initResponse = await trpcClient.paystack.transactions.initialize.mutate({
        email: formData.email,
        amount: Math.round(total * 100), // Convert USD total to cents
        reference: paymentReference,
        currency: 'USD',
        description: `Order from Modern E-commerce - ${cartItems.length} items`,
        metadata: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          items: cartItems.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      });



      if (!initResponse.data?.authorization_url) {
        throw new Error('Server failed to return authorization URL');
      }

      // Redirect to Paystack checkout page; the backend callback will verify and create the order.
      window.location.href = initResponse.data.authorization_url;
      return;
    } catch (error) {
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      toast.error(errorMessage);
      console.error('[Checkout] Paystack error:', error);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      await handlePaystackPayment();
    } catch (error) {
      setIsProcessing(false);
      toast.error('Payment failed');
    }
  };

  const handlePaymentSuccess = async (method: string, reference: string) => {
    setIsProcessing(false);

    // Clear cart in the source of truth
    if (isAuthenticated) {
      await clearSupabaseCart();
    }
    localStorage.removeItem('cart');
    localStorage.removeItem('checkout-form-data');
    localStorage.removeItem('checkout-step');
    window.dispatchEvent(new Event('cartUpdated'));
    
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

    if (!validatePayment()) {
      return;
    }

    switch (selectedPayment) {
      case 'visa':
      case 'mastercard':
      case 'applePay':
        await handleCardPayment();
        break;
    }
  };

  if (!isAuthenticated && !sessionRestored) {
    return null; // Show nothing while session is being restored
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-black mb-3">{t('checkout.loginRequired', 'Login Required')}</h1>
          <p className="text-gray-600 mb-8 text-base leading-relaxed">{t('checkout.signInToContinue', 'Please sign in to continue with checkout.')}</p>
          <button
            onClick={() => openAuthModal('login', 'checkout')}
            className="w-full py-4 bg-black text-white rounded font-semibold hover:bg-gray-900 transition-colors duration-200"
          >
            {t('checkout.signInToCheckout', 'Sign In to Checkout')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-6 sm:mb-8 md:mb-12 px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-black">{t('checkout.secureCheckout', 'Secure Checkout')}</h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{t('checkout.completeCheckoutMessage', 'Complete your purchase safely and quickly')}</p>
        </div>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 w-full min-w-0">
            {/* Steps - Refined Indicator */}
            <div className="mb-6 sm:mb-8 md:mb-12 px-0 py-6 sm:py-8 bg-white border border-gray-200 rounded overflow-x-auto">
                <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 min-w-max sm:min-w-0">
                {[
                  { label: t('checkout.shipping', 'Shipping'), id: 'shipping' },
                  { label: t('checkout.payment', 'Payment'), id: 'payment' },
                  { label: t('checkout.review', 'Review'), id: 'review' }
                ].map((item, idx, array) => {
                  const stepOrder = ['shipping', 'payment', 'review'];
                  const currentIdx = stepOrder.indexOf(step);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={item.id} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isCurrent
                              ? 'bg-black text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={24} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <p className={`mt-3 text-sm font-semibold ${
                          isCurrent ? 'text-black' : 'text-gray-600'
                        }`}>
                          {item.label}
                        </p>
                      </div>
                      {idx < array.length - 1 && (
                    <div className="h-2 flex-1 mx-1 sm:mx-2 hidden sm:block"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Step */}
            {step === 'shipping' && (
              <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 mb-6 w-full">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.shippingAddress', 'Shipping Address')}</h2>
                
                <form className="space-y-5 sm:space-y-6">
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleShippingChange}
                        placeholder="John"
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.firstName
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.firstName && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleShippingChange}
                        placeholder="Doe"
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.lastName
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.lastName && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleShippingChange}
                      placeholder="john@example.com"
                      className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                        formErrors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-black focus:ring-black'
                      }`}
                      required
                    />
                    {formErrors.email && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(555) 123-4567"
                      className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                        formErrors.phone
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-black focus:ring-black'
                      }`}
                      required
                    />
                    {formErrors.phone && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleShippingChange}
                      placeholder="123 Main St"
                      className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                        formErrors.address
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-black focus:ring-black'
                      }`}
                      required
                    />
                    {formErrors.address && (
                      <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                        <AlertCircle size={14} /> {formErrors.address}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{getStateLabel(formData.country)} *</label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleShippingChange}
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white ${
                          formErrors.state
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      >
                        <option value="">{t('checkout.selectState', 'Select')} {getStateLabel(formData.country).toLowerCase()}</option>
                        {getStateOptions(formData.country).map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                      {formErrors.state && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.state}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{t('checkout.city', 'City')} *</label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleShippingChange}
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white ${
                          formErrors.city
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      >
                        <option value="">{t('checkout.selectCity', 'Select city')}</option>
                        {getCityOptions(formData.country, formData.state).map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      {formErrors.city && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.city}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">{getPostalCodeLabel(formData.country)} *</label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleShippingChange}
                        placeholder={t('checkout.zipPlaceholder', '10001')}
                        className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                          formErrors.zip
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-black focus:ring-black'
                        }`}
                        required
                      />
                      {formErrors.zip && (
                        <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                          <AlertCircle size={14} /> {formErrors.zip}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-3">{t('checkout.country', 'Country')} *</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors text-base bg-white"
                      required
                    >
                      <option value="US">🇺🇸 United States</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="KE">🇰🇪 Kenya</option>
                      <option value="ES">🇪🇸 Spain</option>
                      <option value="MX">🇲🇽 Mexico</option>
                      <option value="AR">🇦🇷 Argentina</option>
                      <option value="CO">🇨🇴 Colombia</option>
                      <option value="CL">🇨🇱 Chile</option>
                      <option value="BR">🇧🇷 Brazil</option>
                      <option value="PT">🇵🇹 Portugal</option>
                      <option value="AO">🇦🇴 Angola</option>
                      <option value="MZ">🇲🇿 Mozambique</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={setAsDefaultAddress}
                      onChange={(e) => setSetAsDefaultAddress(e.target.checked)}
                      className="h-5 w-5 rounded cursor-pointer accent-black"
                    />
                    <span className="text-sm text-gray-700 font-medium">
                      Set this as my default shipping address
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleContinueToPayment}
                    disabled={isSavingAddress}
                    className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isSavingAddress ? 'Saving Address...' : 'Continue to Payment'}
                    <ChevronRight size={20} />
                  </button>
                </form>
              </div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="space-y-6">
                {/* Payment Methods */}
                <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.paymentMethod', 'Payment Method')}</h2>
                  
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 mb-6 sm:mb-8">
                    {paymentMethods.map(method => (
                      <button
                        key={method.id}
                        onClick={() => {
                          setSelectedPayment(method.id);
                        }}
                        className={`p-4 sm:p-6 rounded border transition-all text-left ${
                          selectedPayment === method.id
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 hover:border-gray-400 bg-white text-black'
                        }`}
                      >
                        <div className={`flex items-center gap-3 mb-2 ${selectedPayment === method.id ? 'opacity-100' : 'opacity-70'}`}>
                          {method.icon}
                          <h3 className="font-bold">{method.name}</h3>
                        </div>
                        <p className={`text-sm ${selectedPayment === method.id ? 'text-gray-100' : 'text-gray-600'}`}>
                          {method.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Security Info */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded flex gap-3">
                    <Lock className="text-green-700 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-green-900">{t('checkout.secureEncrypted', 'Secure & Encrypted')}</p>
                      <p className="text-xs text-green-700">{t('checkout.paymentSecure', 'Your payment information is encrypted and secure')}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setStep('shipping')}
                    className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-black font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    onClick={() => {
                      if (validatePayment()) {
                        setStep('review');
                      }
                    }}
                    className="flex-1 bg-black hover:bg-gray-900 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {t('checkout.reviewOrder', 'Review Order')}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <div className="space-y-4 sm:space-y-6 w-full">
                {/* Order Summary */}
                <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">{t('checkout.reviewYourOrder', 'Review Your Order')}</h2>

                  {/* Shipping Summary */}
                  <div className="pb-6 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-black">{t('checkout.shippingTo', 'Shipping To')}</h3>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {formData.firstName} {formData.lastName}<br />
                      {formData.address}<br />
                      {formData.city}, {formData.state} {formData.zip}<br />
                      {formData.phone}
                    </p>
                  </div>

                  {/* Payment Summary */}
                  <div className="py-6 border-b border-gray-200">
                    <h3 className="font-bold text-black mb-3">{t('checkout.paymentMethod', 'Payment Method')}</h3>
                    <p className="text-gray-700">
                      {paymentMethods.find(m => m.id === selectedPayment)?.name}
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="py-6">
                    <h3 className="font-bold text-black mb-4">{t('checkout.items', 'Items')} ({cartItems.length})</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            ${(parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setStep('payment')}
                    className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-black font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    {isProcessing ? t('checkout.processing', 'Processing...') : `${t('checkout.payNow', 'Pay Now')} $${total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1 w-full min-w-0">
            <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8">
              <h3 className="text-base sm:text-lg font-bold mb-6 sm:mb-8 text-black">{t('checkout.orderSummary', 'Order Summary')}</h3>

              {/* Items */}
              <div className="space-y-4 mb-8 pb-8 border-b border-gray-200 max-h-64 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <p className="text-gray-600 text-sm">No items in cart</p>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      {item.image && (
                        <img
                          src={getHighResImageUrl(item.image)}
                          alt={item.title}
                          className="h-16 w-16 rounded object-contain bg-gray-100 flex-shrink-0"
                          crossOrigin="anonymous"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">×{item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ${(parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.subtotal', 'Subtotal')}</span>
                  <span className="font-medium text-gray-900">{`$${subtotal.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.shipping', 'Shipping')}</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'font-medium text-gray-900'}>
                    {shipping === 0 ? t('checkout.free', 'FREE') : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('checkout.tax', 'Tax')}</span>
                  <span className="font-medium text-gray-900">{`$${tax.toFixed(2)}`}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600">{t('checkout.total', 'Total')}</span>
                  <span className="text-3xl font-bold text-black">{`$${total.toFixed(2)}`}</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.freeShipping', 'Free shipping on orders over $50')}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.returnPolicy', '30-day return policy')}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{t('checkout.securePayments', 'Secure encrypted payments')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
