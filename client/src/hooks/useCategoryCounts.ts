import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CACHE_KEY = "category_counts_cache_v1";

function readCache(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Real product counts per category name (lower-cased), for ordering category
 * navigation by how much stock each one actually has. One light read of the
 * `category_name` column; the last result is cached so the order is stable on
 * the next visit before the request returns.
 */
export function useCategoryCounts() {
  const [counts, setCounts] = useState<Record<string, number>>(readCache);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("category_name")
          .limit(5000);
        if (error || !data || cancelled) return;

        const next: Record<string, number> = {};
        data.forEach(row => {
          const key = String(row.category_name || "")
            .trim()
            .toLowerCase();
          if (key) next[key] = (next[key] || 0) + 1;
        });
        setCounts(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // Storage unavailable: keep the in-memory result.
        }
      } catch {
        // Counts only affect ordering; fall back to the default order.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
