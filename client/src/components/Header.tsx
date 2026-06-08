'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/BrandLogo';
import { readCartFromStorage } from '@/lib/cart';

const t = (_key: string, fallback: string) => fallback;

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('auth.logoutSuccess', 'Logged out successfully'));
      setIsAccountMenuOpen(false);
      navigate('/');
    } catch (error) {
      toast.error(t('auth.logoutError', 'Failed to logout. Please try again.'));
    }
  };

  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem('cart');
      const cartItems = readCartFromStorage(cart);
      const total = cartItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
      setCartCount(total);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!accountMenuRef.current) return;
      const target = event.target as Node;
      if (!accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm w-full">
      {/* Top Navigation */}
      <div className="relative z-20 w-full px-3 sm:px-4 md:px-6 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 mx-auto max-w-full lg:max-w-screen-xl lg:mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-85 transition-opacity flex-shrink-0" aria-label="MotorVault home">
          <BrandLogo className="h-8 sm:h-10 w-auto max-w-[180px]" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-center mx-4">
          <Link href="/products" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Products</Link>
          <Link href="/about" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">About</Link>
          <Link href="/contact" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Contact</Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Cart Icon - always show for guests and authenticated users */}
          <Link href="/cart" className="relative flex items-center gap-1 sm:gap-2 text-sm font-medium hover:text-gray-600">
            <ShoppingCart size={20} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{t('common.cart', 'Cart')}</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <div className="relative z-[60]" ref={accountMenuRef}>
              <button
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 sm:gap-2 rounded-md border border-gray-300 px-2 sm:px-3 py-2 text-xs sm:text-sm hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
              >
                <User size={16} />
                <span className="hidden sm:inline">{user.name || t('header.account', 'Account')}</span>
              </button>
              <div className={`absolute right-0 mt-2 w-40 sm:w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-[60] ${isAccountMenuOpen ? 'block' : 'hidden'}`}>
                <Link href="/account" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100" onClick={() => setIsAccountMenuOpen(false)}>
                  {t('header.myAccount', 'My Account')}
                </Link>
                <Link href="/orders" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100" onClick={() => setIsAccountMenuOpen(false)}>
                  {t('header.myOrders', 'My Orders')}
                </Link>
                <Link href="/tickets" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100" onClick={() => setIsAccountMenuOpen(false)}>
                  {t('header.tickets', 'My Tickets')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  {t('auth.logout', 'Logout')}
                </button>
              </div>
            </div>
          ) : null}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-3 sm:px-4 py-4 space-y-3">
            <Link href="/" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link href="/products" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Products
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/cart" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                  Cart {cartCount > 0 && `(${cartCount})`}
                </Link>
                <Link href="/orders" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                  My Orders
                </Link>
                <Link href="/tickets" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                  My Tickets
                </Link>
              </>
            )}
            <Link href="/about" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Link href="/contact" className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            <div className="border-t border-gray-200 pt-3">
              <Link href="/help" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                Help
              </Link>
              <Link href="/faq" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                FAQ
              </Link>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
