import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
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
import Accessibility from "./pages/Accessibility";
import FAQ from "./pages/FAQ";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth/callback"} component={AuthCallback} />
      <Route path={"/products"} component={Products} />
      <Route path={"/product/:id"} component={ProductDetail} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
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
      <Route path={"/accessibility"} component={Accessibility} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isHomePage = location === '/';

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthModalProvider>
          <TooltipProvider>
            <Toaster />
            <AuthModal />
            <div className="flex min-h-screen flex-col bg-background w-full overflow-x-hidden">
              <Header />
              <main className={`flex-1 w-full overflow-x-hidden ${isHomePage ? '' : 'pt-0'}`}>
                <Router />
              </main>
              <Footer />
            </div>
          </TooltipProvider>
        </AuthModalProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
