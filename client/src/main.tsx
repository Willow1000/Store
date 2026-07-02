// Silence client-side debug logs in production build
if (import.meta.env.PROD) {
  try {
    (console as any).debug = () => {};
    (console as any).log = () => {};
    (console as any).info = () => {};
  } catch (e) {
    // ignore
  }
}

import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { initializeSiteLanguage } from './lib/language';
import superjson from "superjson";
import App from "./App";
import { supabase } from "@/lib/supabase";
import { createHeadCollector, HeadProvider } from './lib/headManager';
import "./index.css";

const queryClient = new QueryClient();
let authBootstrapComplete = false;

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // During refresh or third-party redirects, tRPC requests can race ahead of
  // session restoration. Avoid forcing auth UI until bootstrap confirms
  // whether a session truly exists.
  if (!authBootstrapComplete) return;

  void supabase.auth.getSession().then(({ data: { session } }) => {
    // If a session exists, this unauthorized state is transient; let the app recover.
    if (session?.access_token) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('auth:required', {
        detail: {
          redirectTo: `${window.location.pathname}${window.location.search}`,
        },
      })
    );
  });
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        // Get Supabase session and add token to Authorization header
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const headers = new Headers(init?.headers);
            headers.set('Authorization', `Bearer ${session.access_token}`);

            return globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
              headers,
            });
          }
        } catch (error) {
          console.warn('[tRPC] Failed to get Supabase session:', error);
        }
        
        // Fallback: fetch without Authorization header
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

async function bootstrapApp() {
  try {
    // Restore auth session before mounting so Supabase queries don't timeout
    try {
      await supabase.auth.getSession();
    } catch (sessionErr) {
      console.warn('[auth] initial session bootstrap failed', sessionErr);
    } finally {
      authBootstrapComplete = true;
    }

    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const headCollector = createHeadCollector();
    const appTree = (
      <HeadProvider collector={headCollector}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </trpc.Provider>
      </HeadProvider>
    );

    if (rootElement.hasChildNodes()) {
      hydrateRoot(rootElement, appTree);
    } else {
      createRoot(rootElement).render(appTree);
    }

    // Initialize currency/geolocation in the background after mounting
    try {
      const { default: currencyClient } = await import('./lib/currencyClient');
      void currencyClient.init().then(() => {
        initializeSiteLanguage(currencyClient.getGeoData());
      });
    } catch (e) {
      console.warn('[currencyClient] initialization failed', e);
    }
  } catch (e) {
    console.error('[bootstrap] Fatal error:', e);
  }
}

bootstrapApp();
