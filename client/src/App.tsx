import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthModal from "./components/AuthModal";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Search from "./pages/Search";
import AuthCallback from "./pages/AuthCallback";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Shipping from "./pages/Shipping";
import Returns from "./pages/Returns";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import About from "./pages/About";
import Accessibility from "./pages/Accessibility";
import FAQ from "./pages/FAQ";
import Tickets from "./pages/Tickets";
import { SITE_LANGUAGE_CHANGED_EVENT, getSiteLanguage, getSiteLanguageSource, translateText, type SiteLanguageCode } from "./lib/language";
import { preloadTranslations, useGlobalAutoTranslation } from "./lib/autoTranslate";
import currencyClient from "./lib/currencyClient";
import { GLOBAL_TRANSLATION_PRELOAD_TEXTS, TRANSLATION_PRELOAD_VERSION } from "./lib/translationPreload";
import { Skeleton } from "@/components/ui/skeleton";
import { HomePageSkeleton } from "@/components/skeletons/HomePageSkeleton";
import { ProductsPageSkeleton } from "@/components/skeletons/ProductsPageSkeleton";
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";

const PRELOAD_DONE_KEY_PREFIX = 'site-translation-preload-done';

function getPreloadDoneKey(language: SiteLanguageCode): string {
  return `${PRELOAD_DONE_KEY_PREFIX}:${TRANSLATION_PRELOAD_VERSION}:${language}`;
}

function isPreloadDone(language: SiteLanguageCode): boolean {
  if (language === 'en') return true;
  try {
    return localStorage.getItem(getPreloadDoneKey(language)) === '1';
  } catch {
    return false;
  }
}

function markPreloadDone(language: SiteLanguageCode): void {
  if (language === 'en') return;
  try {
    localStorage.setItem(getPreloadDoneKey(language), '1');
  } catch {
    // ignore storage issues
  }
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth/callback"} component={AuthCallback} />
      <Route path={"/products"} component={Products} />
      <Route path={"/product/:id"} component={ProductDetail} />
      <Route path={"/about"} component={About} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/checkout/meta"} component={Checkout} />
      <Route path={"/account"} component={Account} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/orders/:id"} component={OrderDetail} />
      <Route path={"/search"} component={Search} />
      <Route path={"/help"} component={Help} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/shipping"} component={Shipping} />
      <Route path={"/returns"} component={Returns} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/cookies"} component={Cookies} />
      <Route path={"/tickets"} component={Tickets} />
      <Route path={"/accessibility"} component={Accessibility} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function RouteTranslationSkeleton({ path }: { path: string }) {
  if (path === '/') {
    return <HomePageSkeleton />;
  }

  if (path === '/products' || path.startsWith('/search')) {
    return <ProductsPageSkeleton />;
  }

  if (path.startsWith('/product/')) {
    return <ProductDetailSkeleton />;
  }

  if (path === '/cart') {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <Skeleton className="h-10 w-56 mb-6" />
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-lg border border-border bg-white p-4">
                <Skeleton className="h-24 w-24 rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-11/12" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4 rounded-lg border border-border bg-white p-5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (path === '/checkout' || path === '/checkout/meta') {
    return (
      <div className="min-h-screen bg-white w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
      <Skeleton className="h-10 w-52 mb-6" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}

function App() {
  const [location] = useLocation();
  const isHomePage = location === '/';
  const [language, setLanguage] = useState<SiteLanguageCode>(() => getSiteLanguage());
  const [pendingLanguage, setPendingLanguage] = useState<SiteLanguageCode | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [routePendingTranslation, setRoutePendingTranslation] = useState(false);
  const [showRouteSkeleton, setShowRouteSkeleton] = useState(false);
  const [preloadedLanguage, setPreloadedLanguage] = useState<SiteLanguageCode | null>(null);

  const { isTranslating, hasTranslationError, readyLanguage } = useGlobalAutoTranslation(language);

  const isAwaitingLanguage =
    pendingLanguage !== null &&
    !hasTranslationError &&
    readyLanguage !== pendingLanguage;

  const shouldBlockUntilTranslated =
    !hasTranslationError &&
    (isAwaitingLanguage || routePendingTranslation);
  const showLanguageLoading = isAwaitingLanguage && showLoadingOverlay;
  const showTranslationSkeleton = !hasTranslationError && (showLanguageLoading || showRouteSkeleton);
  const loadingLabel = translateText(language, 'loading.selectedLanguage', 'Loading selected language...');

  useEffect(() => {
    if (!pendingLanguage) return;
    if (hasTranslationError || readyLanguage === pendingLanguage) {
      setPendingLanguage(null);
      setShowLoadingOverlay(false);
    }
  }, [pendingLanguage, readyLanguage, hasTranslationError]);

  useEffect(() => {
    if (language === 'en' || hasTranslationError) {
      setRoutePendingTranslation(false);
      return;
    }
    setRoutePendingTranslation(true);
  }, [location, language, hasTranslationError]);

  useEffect(() => {
    if (language === 'en' || hasTranslationError) {
      setRoutePendingTranslation(false);
      return;
    }
    if (routePendingTranslation && !isTranslating) {
      setRoutePendingTranslation(false);
    }
  }, [routePendingTranslation, isTranslating, language, hasTranslationError]);

  useEffect(() => {
    if (!isAwaitingLanguage) {
      setShowLoadingOverlay(false);
      return;
    }

    // Avoid flashing the loader for very fast language transitions.
    const timer = window.setTimeout(() => setShowLoadingOverlay(true), 90);
    return () => window.clearTimeout(timer);
  }, [isAwaitingLanguage]);

  useEffect(() => {
    const needsSkeleton = isAwaitingLanguage || routePendingTranslation;
    if (!needsSkeleton) {
      setShowRouteSkeleton(false);
      return;
    }

    // Small delay avoids skeleton flash on instant cache hits.
    const timer = window.setTimeout(() => setShowRouteSkeleton(true), 90);
    return () => window.clearTimeout(timer);
  }, [isAwaitingLanguage, routePendingTranslation]);

  useEffect(() => {
    const onLanguageChanged = () => {
      const nextLanguage = getSiteLanguage();
      setPendingLanguage(nextLanguage);
      setLanguage(nextLanguage);
      if (!isPreloadDone(nextLanguage) && nextLanguage !== 'en') {
        void preloadTranslations(nextLanguage, GLOBAL_TRANSLATION_PRELOAD_TEXTS).then(() => {
          markPreloadDone(nextLanguage);
          setPreloadedLanguage(nextLanguage);
        });
      }
    };
    window.addEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
    window.addEventListener('storage', onLanguageChanged);
    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
      window.removeEventListener('storage', onLanguageChanged);
    };
  }, []);

  useEffect(() => {
    if (language === 'en') return;
    if (isPreloadDone(language) || preloadedLanguage === language) return;

    const run = () => {
      void preloadTranslations(language, GLOBAL_TRANSLATION_PRELOAD_TEXTS).then(() => {
        markPreloadDone(language);
        setPreloadedLanguage(language);
      });
    };

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(run, { timeout: 1500 });
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(id);
        }
      };
    }

    const timer = window.setTimeout(run, 150);
    return () => window.clearTimeout(timer);
  }, [language, preloadedLanguage]);

  useEffect(() => {
    if (language === 'en') return;
    if (isPreloadDone(language)) return;

    // Warm translations again when user changes page so text needed on upcoming pages is already cached.
    void preloadTranslations(language, GLOBAL_TRANSLATION_PRELOAD_TEXTS).then(() => {
      markPreloadDone(language);
      setPreloadedLanguage(language);
    });
  }, [location, language]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthModalProvider>
          <TooltipProvider>
            <Toaster />
            <AuthModal />

            <div
              className="flex min-h-screen flex-col bg-background w-full overflow-x-hidden"
              style={{ visibility: shouldBlockUntilTranslated ? 'hidden' : 'visible' }}
            >
              <Header />
              <main className={`flex-1 w-full overflow-x-hidden ${isHomePage ? '' : 'pt-0'}`}>
                <Router />
              </main>
              <Footer />
            </div>

            {showTranslationSkeleton && (
              <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-[1px] overflow-auto">
                <div className="px-4 pt-4 text-xs font-medium text-gray-600">{loadingLabel}</div>
                <RouteTranslationSkeleton path={location} />
              </div>
            )}

          </TooltipProvider>
        </AuthModalProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
