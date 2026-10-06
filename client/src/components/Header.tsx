"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingCart,
  Menu,
  X,
  LogOut,
  User,
  Search,
  Globe,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { readCartFromStorage } from "@/lib/cart";
import currencyClient from "@/lib/currencyClient";
import {
  SITE_LANGUAGE_CHANGED_EVENT,
  SUPPORTED_SITE_LANGUAGES,
  getSiteLanguage,
  setSiteLanguage,
  clearSiteLanguageOverride,
  getSiteLanguageSource,
  translateText,
  type SiteLanguageCode,
} from "@/lib/language";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [language, setLanguage] = useState<SiteLanguageCode>(() =>
    getSiteLanguage()
  );
  const [isAutoLanguage, setIsAutoLanguage] = useState(
    () => getSiteLanguageSource() !== "manual"
  );
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const t = (key: string, fallback: string) =>
    translateText(language, key, fallback);

  // Header search hands off to the existing /search results route.
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;
    setIsMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const isActivePath = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const navLinks = [
    { href: "/products", label: t("header.products", "Products") },
    { href: "/vin-decoder", label: t("header.vinDecoder", "VIN Decoder") },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: t("header.about", "About") },
    { href: "/contact", label: t("header.contact", "Contact") },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("auth.logoutSuccess", "Logged out successfully"));
      setIsAccountMenuOpen(false);
      navigate("/");
    } catch (error) {
      toast.error(t("auth.logoutError", "Failed to logout. Please try again."));
    }
  };

  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem("cart");
      const cartItems = readCartFromStorage(cart);
      const total = cartItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
      setCartCount(total);
    };

    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      const storedLanguage = getSiteLanguage();
      if (storedLanguage !== language) {
        setLanguage(storedLanguage);
      }
    };

    syncFromStorage();
    const timer = window.setTimeout(syncFromStorage, 800);

    const onLanguageChanged = () => {
      const next = getSiteLanguage();
      if (next === language) return;
      setLanguage(next);
    };
    const onStorageLanguageChanged = (event: StorageEvent) => {
      if (event.key !== "site-language") return;
      onLanguageChanged();
    };
    window.addEventListener(
      SITE_LANGUAGE_CHANGED_EVENT,
      onLanguageChanged as EventListener
    );
    window.addEventListener("storage", onStorageLanguageChanged);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        SITE_LANGUAGE_CHANGED_EVENT,
        onLanguageChanged as EventListener
      );
      window.removeEventListener("storage", onStorageLanguageChanged);
    };
  }, [language]);

  const searchLabel = t(
    "header.searchPlaceholder",
    "Search parts, brands, part numbers"
  );

  const searchForm = (className: string) => (
    <form
      role="search"
      onSubmit={handleSearchSubmit}
      className={`relative ${className}`}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <input
        type="search"
        name="q"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-transparent bg-gray-100 pl-9 pr-4 text-base text-ink sm:h-10 sm:text-sm placeholder:text-gray-500 outline-none transition-[border-color,background-color,box-shadow] focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/10 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </form>
  );

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        {/* Top Navigation */}
        <div className="container relative z-20 flex h-14 items-center gap-3 sm:h-16 sm:gap-5">
          {/* Logo */}
          <Link
            href="/"
            className="flex flex-shrink-0 items-center transition-opacity hover:opacity-80"
            aria-label="MotorVault home"
          >
            <BrandLogo className="h-8 w-auto max-w-[150px] sm:h-9 sm:max-w-[180px]" />
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-0.5 lg:flex xl:gap-1"
          >
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActivePath(link.href) ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-ink xl:px-3 ${
                  isActivePath(link.href) ? "text-ink" : "text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search (tablet and up) */}
          {searchForm(
            "hidden min-w-0 flex-1 md:block lg:mx-auto lg:max-w-xs xl:max-w-md"
          )}

          {/* Right Actions */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
            <label className="relative hidden items-center sm:flex">
              <span className="sr-only">
                {t("header.language", "Language")}
              </span>
              <Globe
                className="pointer-events-none absolute left-2.5 h-4 w-4 text-gray-500"
                aria-hidden="true"
              />
              <select
                value={isAutoLanguage ? "auto" : language}
                onChange={e => {
                  const value = e.target.value;
                  // "auto" clears the manual override so region detection runs
                  // again; picking a language pins it as before.
                  if (value === "auto") {
                    setLanguage(
                      clearSiteLanguageOverride(currencyClient.getGeoData())
                    );
                    setIsAutoLanguage(true);
                    return;
                  }
                  const next = value as SiteLanguageCode;
                  setSiteLanguage(next);
                  setLanguage(next);
                  setIsAutoLanguage(false);
                }}
                className="h-10 max-w-[9.5rem] cursor-pointer appearance-none truncate rounded-md border border-transparent bg-transparent pl-8 pr-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-100 focus:border-ink"
                aria-label={t("header.selectLanguage", "Select language")}
              >
                <option value="auto">
                  {t("language.option.auto", "Auto (by region)")}
                </option>
                {SUPPORTED_SITE_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {t(`language.option.${lang.code}`, lang.nativeName)}
                  </option>
                ))}
              </select>
            </label>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative z-[60]" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen(prev => !prev)}
                  className="flex h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-ink"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <User size={18} aria-hidden="true" />
                  <span className="hidden max-w-[8rem] truncate lg:inline">
                    {user.name || t("header.account", "Account")}
                  </span>
                </button>
                <div
                  className={`absolute right-0 z-[60] mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-pop ${isAccountMenuOpen ? "block" : "hidden"}`}
                >
                  <Link
                    href="/account"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-ink"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    {t("header.myAccount", "My Account")}
                  </Link>
                  <Link
                    href="/orders"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-ink"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    {t("header.myOrders", "My Orders")}
                  </Link>
                  <Link
                    href="/tickets"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-ink"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    {t("header.tickets", "My Tickets")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-ink"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {t("auth.logout", "Logout")}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Cart - always shown for guests and authenticated users */}
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2.5 text-sm font-medium text-ink sm:h-10 transition-colors hover:bg-gray-100"
            >
              <span className="relative">
                <ShoppingCart size={20} aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="price absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-xs font-bold leading-none text-white ring-2 ring-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="hidden lg:inline">
                {t("common.cart", "Cart")}
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-gray-100 lg:hidden"
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-gray-200 bg-white lg:hidden">
            <nav aria-label="Mobile" className="container space-y-1 py-3">
              <Link
                href="/"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.home", "Home")}
              </Link>
              <Link
                href="/products"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.products", "Products")}
              </Link>
              <Link
                href="/vin-decoder"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.vinDecoder", "VIN Decoder")}
              </Link>
              <Link
                href="/blog"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    href="/cart"
                    className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("common.cart", "Cart")}{" "}
                    {cartCount > 0 && `(${cartCount})`}
                  </Link>
                  <Link
                    href="/orders"
                    className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("header.myOrders", "My Orders")}
                  </Link>
                  <Link
                    href="/tickets"
                    className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("header.tickets", "My Tickets")}
                  </Link>
                </>
              )}
              <Link
                href="/about"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.about", "About")}
              </Link>
              <Link
                href="/contact"
                className="block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.contact", "Contact")}
              </Link>
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-gray-200 pt-3">
                <Link
                  href="/help"
                  className="block rounded-md px-3 py-3 text-sm text-gray-600 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("header.help", "Help")}
                </Link>
                <Link
                  href="/faq"
                  className="block rounded-md px-3 py-3 text-sm text-gray-600 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("header.faq", "FAQ")}
                </Link>
              </div>
              <div className="border-t border-gray-200 px-3 pb-2 pt-4">
                <label
                  htmlFor="mobile-language"
                  className="eyebrow mb-1.5 block"
                >
                  {t("header.language", "Language")}
                </label>
                <select
                  id="mobile-language"
                  value={language}
                  onChange={e => {
                    const next = e.target.value as SiteLanguageCode;
                    setSiteLanguage(next);
                    setLanguage(next);
                  }}
                  className="field"
                  aria-label={t("header.selectLanguage", "Select language")}
                >
                  {SUPPORTED_SITE_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {t(`language.option.${lang.code}`, lang.nativeName)}
                    </option>
                  ))}
                </select>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Search (mobile): its own row under the bar. It scrolls away with the
          page so the sticky header stays one compact line on small screens. */}
      <div className="border-b border-gray-200 bg-white py-2.5 md:hidden">
        <div className="container">{searchForm("w-full")}</div>
      </div>
    </>
  );
}
