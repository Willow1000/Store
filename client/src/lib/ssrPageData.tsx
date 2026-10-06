import { createContext, useContext, type ReactNode } from "react";
import type { Category } from "@/hooks/useSupabaseProducts";
import type { Product, ProductImage } from "@/types/supabase";

/**
 * Data the server fetched for the page it rendered, handed to the client so
 * its first render matches the server's.
 *
 * The data hooks fetch inside useEffect, which never runs during server
 * rendering, so without this every product, listing and category page reached
 * crawlers as a loading skeleton: no product text, no product links, and
 * category pages whose heading and canonical were guessed from the URL. The
 * hooks now start from this data when it matches what they are asked for, and
 * refresh it client-side as before. Matching is by product id / category slug,
 * so after a client-side navigation the data simply stops matching and the
 * hooks fetch as they always did.
 *
 * The same object travels to the browser as JSON in a
 * <script type="application/json" id="__MV_SSR_DATA__"> tag.
 */
export type SsrPageData = {
  /** Every category, so category links, headings and canonicals resolve. */
  categories?: Category[];
  /** The product of a /product/:id page, with its gallery. */
  product?: { product: Product; images: ProductImage[] };
  /**
   * The first products of a listing (home, /products or a category page),
   * with only the fields product cards render.
   */
  listing?: {
    /** The category slug when this is a category page, else "". */
    categorySlug: string;
    products: Product[];
  };
};

export const SSR_DATA_SCRIPT_ID = "__MV_SSR_DATA__";

const SsrPageDataContext = createContext<SsrPageData | null>(null);

export function SsrPageDataProvider({
  data,
  children,
}: {
  data: SsrPageData | null;
  children: ReactNode;
}) {
  return (
    <SsrPageDataContext.Provider value={data}>
      {children}
    </SsrPageDataContext.Provider>
  );
}

export function useSsrPageData(): SsrPageData | null {
  return useContext(SsrPageDataContext);
}

/**
 * True while the browser is still on the URL the server rendered. Hooks then
 * start from exactly what the server rendered with (its data, or nothing) -
 * not from localStorage caches the server could not see - or React throws the
 * server HTML away. After a client-side navigation the server's data no
 * longer describes the page and caches are the better head start.
 *
 * Tied to the URL rather than to "first render committed" because lazily
 * loaded routes hydrate after the rest of the app has committed.
 */
const initialUrl =
  typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}`
    : null;

export function isHydrating(): boolean {
  if (typeof window === "undefined" || initialUrl === null) return false;
  return `${window.location.pathname}${window.location.search}` === initialUrl;
}

/**
 * Serialises the data for a <script type="application/json"> tag. `<` is
 * escaped so text inside the data (product descriptions come from outside
 * sources) can never close the script element.
 */
export function serializeSsrPageData(data: SsrPageData): string {
  return `<script type="application/json" id="${SSR_DATA_SCRIPT_ID}">${JSON.stringify(
    data
  ).replace(/</g, "\\u003c")}</script>`;
}

/** Reads the data embedded by the server; null on a client-only render. */
export function readEmbeddedSsrPageData(): SsrPageData | null {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(SSR_DATA_SCRIPT_ID);
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent) as SsrPageData;
  } catch {
    return null;
  }
}
