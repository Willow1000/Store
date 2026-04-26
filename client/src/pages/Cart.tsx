import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CartItem {
  productIndex: number;
  title: string;
  price: string;
  image: string;
  quantity: number;
}

interface Product {
  title: string;
  price: string;
  image_urls: string[];
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load products from JSON
  useEffect(() => {
    fetch('/data/products.json')
      .then(res => res.json())
      .then(data => {
        const allProducts: Product[] = [];
        if (typeof data === 'object' && !Array.isArray(data)) {
          for (const items of Object.values(data)) {
            if (Array.isArray(items)) {
              allProducts.push(...items);
            }
          }
        }
        setProducts(allProducts);
      })
      .catch(err => console.error('Failed to load products:', err));
  }, []);

  // Load cart items from localStorage
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
    setIsLoading(false);
  }, []);

  const updateCartQuantity = (productIndex: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productIndex);
      return;
    }

    const updatedCart = cartItems.map(item =>
      item.productIndex === productIndex ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    toast.success('Cart updated!');
  };

  const removeFromCart = (productIndex: number) => {
    const updatedCart = cartItems.filter(item => item.productIndex !== productIndex);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    toast.success('Item removed from cart!');
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
    return sum + (price * item.quantity);
  }, 0);

  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container px-4 sm:px-6 md:px-8 py-12 md:py-16">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12 sm:py-16">
          <p className="mb-4 text-lg sm:text-xl font-semibold text-gray-900">Your cart is empty</p>
          <p className="mb-8 text-sm sm:text-base text-gray-600 text-center max-w-sm">Start shopping to add items to your cart</p>
          <Link href="/products">
            <a className="inline-flex items-center gap-2 px-6 py-3 sm:py-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base">
              Continue Shopping
              <ArrowRight size={18} />
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="mb-6 sm:mb-8 text-3xl sm:text-4xl font-bold text-gray-900">Shopping Cart</h1>

        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.productIndex} className="flex gap-4 rounded-lg border border-border bg-white p-4">
                  {/* Product Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-contain p-2"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <Link href={`/product/${item.productIndex}`}>
                      <a className="font-semibold hover:text-blue-600 line-clamp-2">{item.title}</a>
                    </Link>
                    <p className="mb-3 text-sm text-gray-600">
                      ${parseFloat(item.price.replace(/[^\d.]/g, '') || '0').toFixed(2)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.productIndex, item.quantity - 1)}
                        className="rounded-md border border-border px-3 py-2 hover:bg-secondary transition-colors min-h-10 min-w-10 flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.productIndex, item.quantity + 1)}
                        className="rounded-md border border-border px-3 py-2 hover:bg-secondary transition-colors min-h-10 min-w-10 flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Price & Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-bold text-sm sm:text-base">
                      ${(parseFloat(item.price.replace(/[^\d.]/g, '') || '0') * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.productIndex)}
                      className="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors min-h-10 min-w-10 flex items-center justify-center"
                      aria-label="Remove from cart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping */}
            <Link href="/products">
              <a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:text-gray-600">
                ← Continue Shopping
              </a>
            </Link>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg border border-border bg-white p-4 sm:p-6 h-fit">
            <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold">Order Summary</h2>

            <div className="space-y-3 sm:space-y-4 border-b border-border pb-4">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="my-4 flex justify-between">
              <span className="font-bold text-base sm:text-lg">Total</span>
              <span className="text-xl sm:text-2xl font-bold">${total.toFixed(2)}</span>
            </div>

            {shipping > 0 && (
              <p className="mb-4 text-xs text-gray-600">
                Free shipping on orders over $50
              </p>
            )}

            <button
              onClick={() => {
                toast.success('Proceeding to checkout...');
              }}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Proceed to Checkout
            </button>

            <Link href="/products">
              <a className="mt-3 w-full inline-block text-center py-2.5 sm:py-3 rounded-lg border border-border bg-background font-semibold hover:bg-secondary transition-colors text-sm sm:text-base">
                Continue Shopping
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
