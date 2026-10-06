import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/supabase";

/**
 * Catalogue reads for two home rails that cannot be derived from the "newest
 * 24/48 products" the page already loads: with several hundred products, the
 * cheap items and the discounted items are mostly outside that window.
 *
 * Read-only, two small queries, real data only:
 *  - budget: in-stock products priced under `budgetCeilingUsd`, cheapest first
 *  - deals: in-stock products whose compare-at price (`discount`) is above
 *    the selling price, newest first
 */
export function useHomeRails(budgetCeilingUsd: number, limit = 10) {
  const [budget, setBudget] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [budgetResult, dealsResult] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .gt("price", 0)
            .lt("price", budgetCeilingUsd)
            .gt("stock", 0)
            .order("price", { ascending: true })
            .limit(limit * 6),
          supabase
            .from("products")
            .select("*")
            .not("discount", "is", null)
            .gt("stock", 0)
            .order("created_at", { ascending: false })
            .limit(60),
        ]);
        if (cancelled) return;

        if (!budgetResult.error) {
          // Cheapest first, but no more than two per brand so one brand's
          // range does not fill the whole rail.
          const perBrand = new Map<string, number>();
          const varied = ((budgetResult.data || []) as Product[]).filter(
            product => {
              const key = String(product.brand || product.id).toLowerCase();
              const seen = perBrand.get(key) || 0;
              perBrand.set(key, seen + 1);
              return seen < 2;
            }
          );
          setBudget(varied.slice(0, limit));
        }
        if (!dealsResult.error) {
          // `discount` is a compare-at price: only a deal when above `price`.
          setDeals(
            ((dealsResult.data || []) as Product[]).filter(
              product => Number(product.discount) > Number(product.price)
            )
          );
        }
      } catch {
        // The rails simply stay hidden when the read fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [budgetCeilingUsd, limit]);

  return { budget, deals };
}
