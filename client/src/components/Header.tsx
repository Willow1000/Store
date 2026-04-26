'use client';

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, ShoppingCart, Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [, navigate] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem('cart');
      const cartItems = cart ? JSON.parse(cart) : [];
      setCartCount(cartItems.length);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      {/* Top Navigation */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 sm:gap-2 font-bold text-lg sm:text-xl text-black hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-lg bg-black text-white text-sm sm:text-base">
            M
          </div>
          <span className="hidden sm:inline">ModernMart</span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
            >
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Cart Icon */}
          <Link href="/cart">
            <a className="relative flex items-center gap-1 sm:gap-2 text-sm font-medium hover:text-gray-600">
              <ShoppingCart size={20} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </a>
          </Link>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <div className="relative group">
              <button className="flex items-center gap-1 sm:gap-2 rounded-md border border-gray-300 px-2 sm:px-3 py-2 text-xs sm:text-sm hover:bg-gray-100">
                <User size={16} />
                <span className="hidden sm:inline">{user.name || 'Account'}</span>
              </button>
              <div className="absolute right-0 mt-2 hidden w-40 sm:w-48 rounded-lg border border-gray-200 bg-white shadow-lg group-hover:block z-10">
                <Link href="/account">
                  <a className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100">My Account</a>
                </Link>
                <Link href="/orders">
                  <a className="block px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100">My Orders</a>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs sm:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                Sign In
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => openAuthModal('signup')}
                className="text-xs sm:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                Sign Up
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

      {/* Mobile Search */}
      <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 lg:hidden">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-900"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-gray-50 lg:hidden">
          <nav className="container flex flex-col gap-4 py-4">
            <Link href="/products">
              <a className="text-sm font-medium hover:text-gray-600">Browse Products</a>
            </Link>
            <Link href="/deals">
              <a className="text-sm font-medium hover:text-gray-600">Deals</a>
            </Link>
            <Link href="/new">
              <a className="text-sm font-medium hover:text-gray-600">New Arrivals</a>
            </Link>
          </nav>
        </div>
      )}

      {/* Category Navigation - Desktop */}
      <nav className="hidden border-t border-gray-200 bg-gray-50 lg:block">
        <div className="container mx-auto px-3 sm:px-4 flex gap-2 sm:gap-8 py-3 text-xs sm:text-sm font-medium">
          <Link href="/products">
            <a className="px-1 sm:px-2 hover:text-gray-600 whitespace-nowrap">Browse All</a>
          </Link>
          <Link href="/deals">
            <a className="px-1 sm:px-2 hover:text-gray-600 whitespace-nowrap">Deals</a>
          </Link>
          <Link href="/new">
            <a className="px-1 sm:px-2 hover:text-gray-600 whitespace-nowrap">New Arrivals</a>
          </Link>
          <Link href="/trending">
            <a className="px-1 sm:px-2 hover:text-gray-600 whitespace-nowrap">Trending</a>
          </Link>
        </div>
      </nav>
    </header>
  );
}
