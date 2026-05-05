'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
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
  const { openAuthModal } = useAuthModal();
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm w-full">
      {/* Top Navigation */}
      <div className="relative z-20 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 mx-auto max-w-full lg:max-w-7xl lg:mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-85 transition-opacity flex-shrink-0" aria-label="MotorVault home">
          <BrandLogo className="h-8 sm:h-10 w-auto max-w-[180px]" />
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Cart Icon - Only show if authenticated */}
          {isAuthenticated && (
            <Link href="/cart">
              <a className="relative flex items-center gap-1 sm:gap-2 text-sm font-medium hover:text-gray-600">
                <ShoppingCart size={20} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t('common.cart', 'Cart')}</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </a>
            </Link>
          )}

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
                <Link href="/account">
                  <a
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100"
                  >
                    {t('header.myAccount', 'My Account')}
                  </a>
                </Link>
                <Link href="/orders">
                  <a
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100"
                  >
                    {t('header.myOrders', 'My Orders')}
                  </a>
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
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs sm:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                {t('auth.signIn', 'Sign In')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => openAuthModal('signup')}
                className="text-xs sm:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                {t('auth.signUp', 'Sign Up')}
              </button>
            </div>
          )}

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
            <Link href="/">
              <a className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                Home
              </a>
            </Link>
            <Link href="/products">
              <a className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                Products
              </a>
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/cart">
                  <a className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                    Cart {cartCount > 0 && `(${cartCount})`}
                  </a>
                </Link>
                <Link href="/orders">
                  <a className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                    My Orders
                  </a>
                </Link>
              </>
            )}
            <Link href="/contact">
              <a className="block px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                Contact
              </a>
            </Link>
            <div className="border-t border-gray-200 pt-3">
              <Link href="/help">
                <a className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                  Help
                </a>
              </Link>
              <Link href="/faq">
                <a className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>
                  FAQ
                </a>
              </Link>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
