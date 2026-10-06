import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getHighResImageUrl } from "@/lib/images";
import { Product } from "@/types/supabase";

const RECENTLY_VIEWED_KEY = "recentlyViewed";
const RECENTLY_VIEWED_EVENT = "recentlyViewed:changed";
const MAX_RECENTLY_VIEWED = 10;

function readRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]"
    );
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/** Moves a product to the front of the visitor's recently viewed list. */
export function recordRecentlyViewed(productId: string) {
  if (typeof window === "undefined" || !productId) return;

  try {
    const updated = [
      productId,
      ...readRecentlyViewedIds().filter(id => id !== productId),
    ].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    // The `storage` event only fires in other tabs, so announce it here too.
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  } catch {
    // Ignore storage quota/availability issues.
  }
}

/**
 * The visitor's recently viewed products, most recent first.
 *
 * The ids are resolved with their own query rather than looked up in a page of
 * the catalog the caller happens to have loaded: a viewed product that is not
 * among the newest N rows would otherwise silently drop out of the list. The
 * list is re-read whenever it changes, in this tab or another, and when the
 * page is shown again.
 */
export function useRecentlyViewed(limit = MAX_RECENTLY_VIEWED) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const refresh = () => {
      const next = readRecentlyViewedIds();
      setIds(prev => (prev.join() === next.join() ? prev : next));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RECENTLY_VIEWED_KEY) refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener(RECENTLY_VIEWED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const wantedKey = ids.slice(0, limit).join();

  useEffect(() => {
    const wanted = wantedKey ? wantedKey.split(",") : [];
    if (wanted.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .in("id", wanted);
        if (error) throw error;
        if (cancelled) return;

        const byId = new Map(
          ((data || []) as Product[]).map(product => [
            String(product.id),
            {
              ...product,
              cover_image_url: getHighResImageUrl(
                product?.cover_image_url || ""
              ),
            },
          ])
        );
        // Keep viewing order; ids whose product no longer exists drop out.
        setProducts(
          wanted
            .map(id => byId.get(id))
            .filter((product): product is Product => Boolean(product))
        );
      } catch {
        // Keep whatever is already showing rather than blanking the section.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wantedKey]);

  return { ids, products };
}
