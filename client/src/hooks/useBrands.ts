import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Brand } from "@/types/supabase";
import { isTimeoutError, recoverFromTimeout } from "@/lib/sessionRecovery";

const BRANDS_CACHE_KEY = "brands_cache_v1";

function readCachedArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeCachedArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/availability issues and keep runtime data.
  }
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>(() =>
    readCachedArray<Brand>(BRANDS_CACHE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchAttempted = useRef(false);

  useEffect(() => {
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;

    const fetchBrands = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Brands fetch timed out")), 10000)
        );

        const fetchPromise = (async () => {
          const { data, error: supabaseError } = await supabase
            .from("brand")
            .select("id, name, image_url, created_at")
            .order("name", { ascending: true });

          if (supabaseError) {
            throw supabaseError;
          }
          return (data || []) as Brand[];
        })();

        const fetchedBrands = await Promise.race([
          fetchPromise,
          timeoutPromise,
        ]);

        if (fetchedBrands.length > 0) {
          setBrands(fetchedBrands);
          writeCachedArray(BRANDS_CACHE_KEY, fetchedBrands);
        } else {
          // Still try to use cache if available
          const cached = readCachedArray<Brand>(BRANDS_CACHE_KEY);
          if (cached.length > 0) {
            setBrands(cached);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch brands";
        setError(message);

        if (isTimeoutError(err)) {
          await recoverFromTimeout(message);
        }

        // Try to use cached data if available
        const cached = readCachedArray<Brand>(BRANDS_CACHE_KEY);
        if (cached.length > 0) {
          setBrands(cached);
          setError(null); // Clear error if we have cache
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  return { brands, isLoading, error };
}
