import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Router as WouterRouter } from "wouter";
import { useLocation } from "wouter";
import { Suspense, lazy, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthModal from "./components/AuthModal";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SITE_LANGUAGE_CHANGED_EVENT, getSiteLanguage, getSiteLanguageSource, translateText, type SiteLanguageCode } from "./lib/language";
import { preloadTranslations, useGlobalAutoTranslation } from "./lib/autoTranslate";
import currencyClient from "./lib/currencyClient";
import { GLOBAL_TRANSLATION_PRELOAD_TEXTS, TRANSLATION_PRELOAD_VERSION } from "./lib/translationPreload";
import { Skeleton } from "@/components/ui/skeleton";
import { HomePageSkeleton } from "@/components/skeletons/HomePageSkeleton";
import { ProductsPageSkeleton } from "@/components/skeletons/ProductsPageSkeleton";
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";
import { AboutPageSkeleton } from "@/components/skeletons/AboutPageSkeleton";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/lib/supabase";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Search = lazy(() => import("./pages/Search"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Help = lazy(() => import("./pages/Help"));
const Contact = lazy(() => import("./pages/Contact"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Returns = lazy(() => import("./pages/Returns"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const About = lazy(() => import("./pages/About"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Tickets = lazy(() => import("./pages/Tickets"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

function AppRoutes() {
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
      <Route path={"/payment/success"} component={PaymentSuccess} />
      <Route path={"/payment/failed"} component={PaymentFailed} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function createStaticRouterHook(pathname: string) {
  return () => [pathname, () => undefined] as [string, (path: string) => void];
}

function CenteredStatusSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
      <Skeleton className="h-10 w-56 mb-6" />
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4 space-y-3">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
      <Skeleton className="h-8 w-36 mb-4" />
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 flex gap-4">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-white p-4 h-fit">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ContentPageSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function LegalPageSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
      <Skeleton className="h-10 w-56 mb-6" />
      <div className="rounded-xl border border-border bg-white p-5 sm:p-6 space-y-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-11/12' : i % 2 === 0 ? 'w-4/5' : 'w-full'}`} />
        ))}
      </div>
    </div>
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

  if (path === '/about') {
    return <AboutPageSkeleton />;
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

  if (path === '/account' || path === '/orders' || path === '/tickets') {
    return <DashboardSkeleton />;
  }

  if (path.startsWith('/orders/')) {
    return <OrderDetailPageSkeleton />;
  }

  if (path === '/auth/callback' || path === '/payment/success' || path === '/payment/failed' || path === '/404') {
    return <CenteredStatusSkeleton />;
  }

  if (path === '/privacy' || path === '/terms' || path === '/cookies') {
    return <LegalPageSkeleton />;
  }

  if (
    path === '/contact' ||
    path === '/help' ||
    path === '/shipping' ||
    path === '/returns' ||
    path === '/accessibility' ||
    path === '/faq'
  ) {
    return <ContentPageSkeleton />;
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

function AppContent() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const isHomePage = location === '/';
  const canonicalPath = location.startsWith('/') ? location : `/${location}`;
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
    false;
  const showLanguageLoading = isAwaitingLanguage && showLoadingOverlay;
  const showTranslationSkeleton = false;
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

    const timer = globalThis.setTimeout(run, 150);
    return () => globalThis.clearTimeout(timer);
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-language-source', getSiteLanguageSource());
  }, [language]);

  useEffect(() => {
    let lastRun = 0;

    const revalidateProtectedState = async () => {
      const now = Date.now();
      if (now - lastRun < 1000) return;
      lastRun = now;

      try {
        await supabase.auth.getSession();
      } catch {
        // Ignore transient session refresh errors.
      }

      queryClient.invalidateQueries({
        predicate: (query) => {
          const rootKey = String(query.queryKey?.[0] || '');
          return rootKey.includes('auth') || rootKey.includes('order') || rootKey.includes('ticket') || rootKey.includes('account');
        },
      });
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void revalidateProtectedState();
      }
    };

    window.addEventListener('focus', revalidateProtectedState);
    window.addEventListener('pageshow', revalidateProtectedState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', revalidateProtectedState);
      window.removeEventListener('pageshow', revalidateProtectedState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [queryClient]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthModalProvider>
          <TooltipProvider>
            <Toaster />
            <AuthModal />
            <SEOHead canonical={canonicalPath} />

            <div
              className="flex min-h-screen flex-col bg-background w-full overflow-x-hidden"
              style={{ visibility: shouldBlockUntilTranslated ? 'hidden' : 'visible' }}
            >
              <Header />
              <main className={`flex-1 w-full overflow-x-hidden ${isHomePage ? '' : 'pt-0'}`}>
                <Suspense fallback={<RouteTranslationSkeleton path={location} />}>
                  <AppRoutes />
                </Suspense>
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

type AppProps = {
  initialPath?: string;
  ssr?: boolean;
};

function App({ initialPath = '/', ssr = false }: AppProps) {
  const shouldUseStaticRouting = ssr || typeof window === 'undefined';

  if (!shouldUseStaticRouting) {
    return <AppContent />;
  }

  return (
    <WouterRouter hook={createStaticRouterHook(initialPath)}>
      <AppContent />
    </WouterRouter>
  );
}

export default App;
