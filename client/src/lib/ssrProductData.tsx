import { createContext, useContext, type ReactNode } from "react";

/**
 * Minimal product fields needed for SEO tags only (title, description,
 * image, category context) - NOT the full product record used to render
 * page content.
 *
 * useProductById fetches inside a useEffect, which never runs during SSR,
 * so ProductDetail's SEOHead always saw product=null server-side and fell
 * back to a single generic title/description for every product page -
 * every product URL looked identical to a crawler. This context lets
 * entry-server.tsx prefetch just enough data server-side to give each
 * product page its own title/description, without touching the actual
 * client-side data-fetching/hydration flow (page content still renders
 * its normal loading skeleton on both server and client, so there's no
 * hydration mismatch - only the <head> tags, which aren't part of the
 * reconciled React tree, differ).
 */
export type SsrProductSeoData = {
  id: string;
  title: string;
  item_specifics?: string | null;
  price?: number | string | null;
  brand?: string | null;
  model?: string | null;
  category_name?: string | null;
  cover_image_url?: string | null;
  part_number?: string | null;
};

const SsrProductDataContext = createContext<SsrProductSeoData | null>(null);

export function SsrProductDataProvider({
  product,
  children,
}: {
  product: SsrProductSeoData | null;
  children: ReactNode;
}) {
  return (
    <SsrProductDataContext.Provider value={product}>
      {children}
    </SsrProductDataContext.Provider>
  );
}

export function useSsrProductData(): SsrProductSeoData | null {
  return useContext(SsrProductDataContext);
}
