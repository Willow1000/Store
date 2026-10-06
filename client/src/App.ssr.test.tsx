import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToReadableStream } from "react-dom/server";
import superjson from "superjson";

/**
 * Routes match on the pathname only. The server used to hand the router the
 * whole request URL, so every URL with a query string - category pages
 * (/products?category=engine, which the XML sitemap lists), ad clicks carrying
 * utm_/fbclid parameters, /search?q=... - matched no route and was
 * server-rendered as the noindex 404 page.
 *
 * Nothing here may reach the network: the Supabase client is replaced with a
 * stub and fetch is made to fail.
 */
vi.mock("@/lib/supabase", () => {
  const result = { data: [], error: null, count: 0 };
  const query: any = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: typeof result) => unknown) => resolve(result);
      }
      return () => query;
    },
    apply: () => query,
  });
  return {
    supabase: {
      from: () => query,
      rpc: () => query,
      channel: () => query,
      removeChannel: () => undefined,
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => undefined } },
        }),
      },
    },
  };
});

vi.stubGlobal("fetch", async () => {
  throw new Error("network access is not allowed in this test");
});

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}
vi.stubGlobal("localStorage", createMemoryStorage());
vi.stubGlobal("sessionStorage", createMemoryStorage());

async function renderUrl(url: string) {
  const { default: App } = await import("./App");
  const { trpc } = await import("./lib/trpc");
  const { createHeadCollector, HeadProvider } = await import(
    "./lib/headManager"
  );
  const { SsrStatusContext } = await import("./lib/ssrStatus");

  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
  });
  const headCollector = createHeadCollector();
  const statusRef = { status: 200 };

  const stream = await renderToReadableStream(
    <HeadProvider collector={headCollector}>
      <SsrStatusContext.Provider value={statusRef}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <App initialPath={url} ssr />
          </QueryClientProvider>
        </trpc.Provider>
      </SsrStatusContext.Provider>
    </HeadProvider>,
    { onError() {} }
  );
  await stream.allReady;
  const html = await new Response(stream).text();

  return { html, head: headCollector.getMarkup(), status: statusRef.status };
}

describe("server render of URLs with a query string", () => {
  it.each([
    "/products?category=engine",
    "/products?utm_source=facebook&fbclid=abc",
    "/products?query=dpf",
    "/?gclid=abc",
    "/about?utm_medium=cpc",
    "/contact?enquiry=1",
  ])("renders the real page for %s", async url => {
    const { head, status } = await renderUrl(url);
    expect(status).toBe(200);
    expect(head).not.toContain("Page Not Found");
    expect(head).not.toContain("noindex");
    expect(head).not.toContain("/404");
  });

  it("keeps tracking parameters out of the canonical URL", async () => {
    const { head } = await renderUrl("/about?utm_medium=cpc&fbclid=abc");
    const canonical = /rel="canonical"[^>]*href="([^"]*)"/.exec(head)?.[1];
    expect(canonical).toMatch(/\/about$/);
  });

  it("renders the same page with and without a query string", async () => {
    const plain = await renderUrl("/products");
    const tracked = await renderUrl("/products?utm_source=facebook");
    const title = (head: string) =>
      /<title[^>]*>(.*?)<\/title>/.exec(head)?.[1];
    expect(title(plain.head)).toBeTruthy();
    expect(title(tracked.head)).toBe(title(plain.head));
  });

  it("still answers an unknown path with the 404 page", async () => {
    const { head, status } = await renderUrl("/no-such-page?utm_source=x");
    expect(status).toBe(404);
    expect(head).toContain("noindex");
  });
});
