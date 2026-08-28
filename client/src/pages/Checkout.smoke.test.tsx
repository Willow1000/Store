// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Checkout.tsx pulls in auth, cart, tRPC, and Supabase directly rather than
// through props/context, so a render test has to stub each of those at the
// module boundary. This is a smoke test only - it locks in that the page
// renders its shipping step and order summary without crashing for a
// logged-out, empty-cart visitor, as a regression guard before extracting
// any pieces of this file into separate components.

// Hoisted so every call to a mocked hook returns the *same* function
// references. Returning fresh `vi.fn()` instances from inside the mock
// factory (a plausible first attempt) means a new value on every render;
// any effect in Checkout.tsx that lists one of these in its dependency
// array then never stops re-running, which manifested as an actual OOM
// crash the first time this test ran, not a normal assertion failure.
const {
  mockLogout,
  mockRefresh,
  mockAddToCart,
  mockUpdateQuantity,
  mockRemoveFromCart,
  mockClearCart,
  mockRefetchCart,
  mockSetLocation,
  mockOffersResolveQuery,
  mockTrpcUtils,
  mockSupabaseFromResult,
  mockEmptySupabaseCartItems,
} = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockRefresh: vi.fn(),
  mockAddToCart: vi.fn(),
  mockUpdateQuantity: vi.fn(),
  mockRemoveFromCart: vi.fn(),
  mockClearCart: vi.fn(),
  mockRefetchCart: vi.fn(),
  mockSetLocation: vi.fn(),
  mockOffersResolveQuery: { data: null, isLoading: false },
  mockTrpcUtils: {},
  // Checkout.tsx chains an arbitrary, varying sequence of Supabase
  // query-builder methods (.select().eq().eq().order().limit().maybeSingle(),
  // .select().in(), etc.) across its different effects. Rather than
  // hardcoding one specific chain shape, this Proxy accepts any method
  // call, always returns itself to keep the chain going, and resolves (it's
  // "thenable") to an empty, error-free result - a query with no matching
  // rows, which every call site here already handles safely.
  mockSupabaseFromResult: (() => {
    const chain: any = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (value: { data: null; error: null }) => void) =>
              resolve({ data: null, error: null });
          }
          return () => chain;
        },
      }
    );
    return chain;
  })(),
  // A fresh [] literal on every call to the mocked hook is a *different*
  // reference each render even though it's always empty - the actual root
  // cause of the OOM above, since Checkout.tsx's cart-loading effect lists
  // this array in its dependency list and unconditionally calls
  // setCartItems() inside, so a "changed" (by reference) empty array every
  // render drove an unbounded render loop.
  mockEmptySupabaseCartItems: [] as unknown[],
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/checkout", mockSetLocation],
}));

const mockAuthedUser = {
  id: 1,
  email: "smoke-test@example.com",
  role: "user",
  name: "Smoke Test",
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockAuthedUser,
    isAuthenticated: true,
    loading: false,
    sessionRestored: true,
    session: null,
    error: null,
    refresh: mockRefresh,
    logout: mockLogout,
  }),
}));

vi.mock("@/hooks/useSupabaseCart", () => ({
  useSupabaseCart: () => ({
    items: mockEmptySupabaseCartItems,
    isLoading: false,
    hasLoadedOnce: true,
    error: null,
    addToCart: mockAddToCart,
    updateQuantity: mockUpdateQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
    refetch: mockRefetchCart,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    offers: {
      resolve: {
        useQuery: () => mockOffersResolveQuery,
      },
    },
    useUtils: () => mockTrpcUtils,
  },
  trpcClient: {
    paystack: {
      transactions: {
        verify: { query: vi.fn() },
        initialize: { mutate: vi.fn() },
      },
    },
    stripe: { payments: { createCheckoutSession: { mutate: vi.fn() } } },
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: () => mockSupabaseFromResult,
  },
}));

vi.mock("@/components/InlineCheckoutAuth", () => ({
  InlineCheckoutAuth: () => <div data-testid="inline-checkout-auth" />,
}));

vi.mock("@/components/TrustSignals", () => ({
  TrustSignals: () => <div data-testid="trust-signals" />,
}));

vi.mock("@/components/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/hooks/useMetaPixel", () => ({
  trackInitiateCheckout: vi.fn(),
  trackPurchase: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Checkout page (smoke test)", () => {
  it("renders the shipping step and order summary for a logged-in visitor with an empty cart", async () => {
    const { default: Checkout } = await import("./Checkout");
    render(<Checkout />);

    expect(
      screen.getByRole("heading", { name: /shipping address/i })
    ).toBeInTheDocument();
    // The "First Name" <label> isn't associated with its <input> via
    // htmlFor/id, so it has no accessible name yet - matching on the
    // placeholder instead reflects the markup as it actually is today.
    expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText(/no items in cart/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue to payment/i })
    ).toBeInTheDocument();
  });
});
