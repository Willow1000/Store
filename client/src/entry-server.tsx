import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToReadableStream } from "react-dom/server";
import superjson from "superjson";
import App from "./App";
import { trpc } from "./lib/trpc";
import { createHeadCollector, HeadProvider } from "./lib/headManager";
import { supabase } from "./lib/supabase";
import {
  SsrProductDataProvider,
  type SsrProductSeoData,
} from "./lib/ssrProductData";
import {
  SsrPageDataProvider,
  serializeSsrPageData,
  type SsrPageData,
} from "./lib/ssrPageData";
import { SsrStatusContext, type SsrStatus } from "./lib/ssrStatus";
import { getHighResImageUrl } from "./lib/images";
import { rankProducts } from "./lib/recommendations";
import {
  PRODUCTS_PER_PAGE,
  countListingPages,
  getPageFromSearch,
} from "./lib/listingPagination";
import { getVehicleContent, vehicleTitleFilter } from "@shared/vehicleContent";
import type { Category } from "./hooks/useSupabaseProducts";
import type { Product, ProductImage } from "./types/supabase";

const PRODUCT_SEO_FIELDS =
  "id, title, item_specifics, price, brand, model, category_name, cover_image_url, part_number, condition";

async function fetchSsrProductSeoData(
  url: string
): Promise<SsrProductSeoData | null> {
  const match = /^\/product\/([^/?#]+)/.exec(url);
  if (!match) return null;

  try {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SEO_FIELDS)
      .eq("id", match[1])
      .maybeSingle();
    if (error || !data) return null;
    return data as SsrProductSeoData;
  } catch {
    // SEO enrichment is best-effort - the page still renders its normal
    // loading state and generic SEOHead fallback if this fails.
    return null;
  }
}

/** Product fields that listing cards render; the rest stay client-side. */
const LISTING_FIELDS =
  "id, title, category_name, price, discount, condition, cover_image_url, brand, model, stock, part_number, created_at";
/** Products of a listing that are server-rendered and embedded. */
const LISTING_LIMIT = PRODUCTS_PER_PAGE;
/** Category pages are small (largest is ~70) - render them whole. */
const CATEGORY_LISTING_LIMIT = 120;

/**
 * Pages that are personal or transactional. They are never cached at the
 * edge (their HTML is generic, but caching them gains nothing and their
 * query strings carry tracking and checkout state).
 */
const PRIVATE_PATH_PREFIXES = [
  "/cart",
  "/checkout",
  "/account",
  "/orders",
  "/tickets",
  "/payment",
  "/auth",
  "/search",
];

const CACHE_PUBLIC = "public, s-maxage=300, stale-while-revalidate=86400";
const CACHE_NOT_FOUND = "public, s-maxage=60";
const CACHE_PRIVATE = "private, no-store";

export type RenderResult = {
  html: string;
  head: string;
  /** HTTP status to send (404 for unknown routes, products and categories). */
  status: number;
  /** When set, send a 301 to this path instead of the page. */
  redirect?: string;
  /** Cache-Control header for the response. */
  cacheControl: string;
};

const asListingProduct = (row: any): Product => ({
  owner_id: null,
  item_specifics: null,
  ...row,
  cover_image_url: getHighResImageUrl(row?.cover_image_url || ""),
});

async function fetchCategories(): Promise<Category[] | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, icon, image_url")
    .order("name", { ascending: true });
  return error ? null : ((data || []) as Category[]);
}

function findCategory(
  categories: Category[],
  value: string
): Category | undefined {
  const needle = value.trim().toLowerCase();
  return (
    categories.find(c => String(c.slug || "").toLowerCase() === needle) ||
    categories.find(c => String(c.name || "").toLowerCase() === needle)
  );
}

/**
 * Fetches the data a page's server render needs. `status`/`redirect` are
 * only set when the database answered definitively - a failed query renders
 * the page normally rather than turning a real page into a 404.
 */
async function loadPageData(
  pathname: string,
  search: URLSearchParams
): Promise<{ data: SsrPageData; status?: number; redirect?: string }> {
  const data: SsrPageData = {};

  const productMatch = /^\/product\/([^/]+)$/.exec(pathname);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    // Product ids are uuids. Anything else can never be a product, and asking
    // the database errors rather than answering "no such row", which used to
    // fall through to an indexable 200.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return { data, status: 404 };
    }
    // Categories too, so the breadcrumb links the category's slug URL
    // rather than its name, which only reaches the page through a redirect.
    const [productResult, imagesResult, categories] = await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase.from("product_images").select("*").eq("product_id", id),
      fetchCategories(),
    ]);
    if (categories) data.categories = categories;
    if (productResult.error) return { data };
    if (!productResult.data) return { data, status: 404 };
    // Same-category products for the "Similar" rails, so they render here
    // (real links for crawlers) instead of appearing after load and pushing
    // the page down.
    const { data: related } = await supabase
      .from("products")
      .select(LISTING_FIELDS)
      .eq("category_name", productResult.data.category_name || "")
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(24);
    data.listing = {
      categorySlug: "",
      products: (related || []).map(asListingProduct),
    };
    data.product = {
      product: {
        ...(productResult.data as Product),
        cover_image_url: getHighResImageUrl(
          productResult.data.cover_image_url || ""
        ),
      },
      images: ((imagesResult.data || []) as ProductImage[]).map(image => ({
        ...image,
        image_url: getHighResImageUrl(image.image_url),
      })),
    };
    return { data };
  }

  const vehicleMatch = /^\/vehicle\/([^/]+)$/.exec(pathname);
  if (vehicleMatch) {
    const vehicle = getVehicleContent(decodeURIComponent(vehicleMatch[1]));
    if (!vehicle) return { data, status: 404 };
    const [{ data: rows, error }, categories] = await Promise.all([
      supabase
        .from("products")
        .select(LISTING_FIELDS)
        .or(vehicleTitleFilter(vehicle))
        .order("created_at", { ascending: false })
        .limit(CATEGORY_LISTING_LIMIT),
      fetchCategories(),
    ]);
    if (categories) data.categories = categories;
    if (!error) {
      data.listing = {
        categorySlug: `vehicle:${vehicle.slug}`,
        products: (rows || []).map(asListingProduct),
      };
    }
    return { data };
  }

  if (pathname !== "/" && pathname !== "/products") return { data };

  const categories = await fetchCategories();
  if (categories) data.categories = categories;

  // Listing pages are paginated by ?page=N. Page 1 has one URL (no
  // parameter), so "?page=1" and malformed values redirect to it.
  const page = pathname === "/products" ? getPageFromSearch(search) : 1;
  if (pathname === "/products" && search.has("page") && page === 1) {
    const rest = new URLSearchParams(search);
    rest.delete("page");
    const query = rest.toString();
    return { data, redirect: query ? `/products?${query}` : "/products" };
  }

  const categoryParam =
    pathname === "/products" ? search.get("category") : null;
  if (categoryParam && categoryParam.trim()) {
    if (!categories) return { data };
    const category = findCategory(categories, categoryParam);
    // A made-up slug used to render an indexable, empty "Bogus Xyz Parts"
    // page; every category URL that is not a real category is a 404.
    if (!category) return { data, status: 404 };
    // One URL per category: the name ("Engines") or another casing
    // redirects to the slug form ("engine") that links and the sitemap use.
    if (categoryParam !== category.slug) {
      return {
        data,
        redirect: `/products?category=${encodeURIComponent(category.slug)}`,
      };
    }
    const { data: rows } = await supabase
      .from("products")
      .select(LISTING_FIELDS)
      .eq("category_name", category.name)
      .order("created_at", { ascending: false })
      .limit(CATEGORY_LISTING_LIMIT);
    data.listing = {
      categorySlug: category.slug,
      products: (rows || []).map(asListingProduct),
    };
    // The whole category is embedded and the page component slices it, so a
    // page past the end would render an empty, indexable listing.
    if (rows && page > countListingPages(rows.length)) {
      return { data, status: 404 };
    }
    return { data };
  }

  // /products shows the "Recommended" order by default. Rank the whole
  // catalogue the way the browser does for a visitor with no history, so the
  // first page rendered here is the first page the browser shows - otherwise
  // the grid reshuffles on load (layout shift).
  const { data: rows } = await supabase
    .from("products")
    .select(LISTING_FIELDS)
    .order("created_at", { ascending: false })
    .limit(pathname === "/products" ? 1000 : LISTING_LIMIT);
  const listingRows = (rows || []).map(asListingProduct);
  if (pathname !== "/products") {
    data.listing = { categorySlug: "", products: listingRows };
    return { data };
  }
  const ranked = rankProducts(listingRows, { newestFirst: true });
  if (rows && page > countListingPages(ranked.length)) {
    return { data, status: 404 };
  }
  data.listing = {
    categorySlug: "",
    products: ranked.slice((page - 1) * LISTING_LIMIT, page * LISTING_LIMIT),
    page,
    total: ranked.length,
  };
  return { data };
}

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function ensureServerPolyfills(): void {
  const g = globalThis as any;
  if (typeof g.localStorage === "undefined") {
    g.localStorage = createMemoryStorage();
  }
  if (typeof g.sessionStorage === "undefined") {
    g.sessionStorage = createMemoryStorage();
  }
}

export async function render(url: string): Promise<RenderResult> {
  ensureServerPolyfills();

  const parsed = new URL(url, "http://localhost");
  const { pathname, search, searchParams } = parsed;

  // Normalise the path before rendering anything: a trailing slash or
  // capital letters used to serve a duplicate of the real page with 200.
  let normalizedPath = pathname;
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.replace(/\/+$/, "") || "/";
  }
  if (/[A-Z]/.test(normalizedPath)) {
    normalizedPath = normalizedPath.toLowerCase();
  }
  if (normalizedPath !== pathname) {
    return {
      html: "",
      head: "",
      status: 301,
      redirect: `${normalizedPath}${search}`,
      cacheControl: CACHE_PUBLIC,
    };
  }

  const isPrivate = PRIVATE_PATH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let pageData: SsrPageData = {};
  let dataStatus: number | undefined;
  try {
    const loaded = await loadPageData(pathname, searchParams);
    if (loaded.redirect) {
      return {
        html: "",
        head: "",
        status: 301,
        redirect: loaded.redirect,
        cacheControl: CACHE_PUBLIC,
      };
    }
    pageData = loaded.data;
    dataStatus = loaded.status;
  } catch {
    // Page data is an enhancement; the page still renders and fetches
    // client-side if the database is unreachable.
  }

  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  const headCollector = createHeadCollector();
  const ssrProduct: SsrProductSeoData | null = pageData.product
    ? (pageData.product.product as unknown as SsrProductSeoData)
    : await fetchSsrProductSeoData(url);
  const statusRef: SsrStatus = { status: dataStatus ?? 200 };

  const app = (
    <HeadProvider collector={headCollector}>
      <SsrStatusContext.Provider value={statusRef}>
        <SsrPageDataProvider data={pageData}>
          <SsrProductDataProvider product={ssrProduct}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
              <QueryClientProvider client={queryClient}>
                <App initialPath={url} ssr />
              </QueryClientProvider>
            </trpc.Provider>
          </SsrProductDataProvider>
        </SsrPageDataProvider>
      </SsrStatusContext.Provider>
    </HeadProvider>
  );

  const stream = await renderToReadableStream(app, {
    onError(error) {},
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }

  html += decoder.decode();
  const status = statusRef.status;
  return {
    html,
    // The data travels with the page so the browser's first render starts
    // from it (see lib/ssrPageData.tsx). Not needed for a 404.
    head:
      headCollector.getMarkup() +
      (status === 200 ? serializeSsrPageData(pageData) : ""),
    status,
    cacheControl: isPrivate
      ? CACHE_PRIVATE
      : status === 200
        ? CACHE_PUBLIC
        : CACHE_NOT_FOUND,
  };
}
