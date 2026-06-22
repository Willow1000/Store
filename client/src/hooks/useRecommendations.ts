import { useCallback, useEffect, useMemo, useState } from 'react';
import { Product } from '@/types/supabase';
import {
  getRecommendationAnalytics,
  getRecommendationProfile,
  getRecommendedProducts,
  getPersonalizedDeals,
  getContinueShoppingProducts,
  getSimilarVehicleParts,
  getCompleteRepairProducts,
  getFrequentlyBoughtTogetherProducts,
  rankProducts,
  RECOMMENDATION_PROFILE_CHANGED_EVENT,
  trackRecommendationEvent,
  type RecommendationSignalEvent,
} from '@/lib/recommendations';

export function useRecommendations(userId?: string | null) {
  const [profile, setProfile] = useState(() => getRecommendationProfile(userId));

  useEffect(() => {
    setProfile(getRecommendationProfile(userId));

    const onProfileChanged = () => setProfile(getRecommendationProfile(userId));
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith('motorvault_recommendation_profile_v1')) {
        onProfileChanged();
      }
    };

    window.addEventListener(RECOMMENDATION_PROFILE_CHANGED_EVENT, onProfileChanged as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(RECOMMENDATION_PROFILE_CHANGED_EVENT, onProfileChanged as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  const track = useCallback((event: Omit<RecommendationSignalEvent, 'userId'>) => {
    const next = trackRecommendationEvent({ ...event, userId });
    setProfile(next);
    return next;
  }, [userId]);

  const rank = useCallback(<T extends Partial<Product>>(products: T[], options: {
    searchTerm?: string;
    preserveWhenNoSignals?: boolean;
    priceDirection?: 'asc' | 'desc';
    newestFirst?: boolean;
  } = {}) => {
    return rankProducts(products, { profile, ...options });
  }, [profile]);

  return useMemo(() => ({
    profile,
    track,
    rank,
    recommendedProducts: (products: Product[], limit?: number) => getRecommendedProducts(products, profile, limit),
    personalizedDeals: (products: Product[], limit?: number, searchTerm?: string) => getPersonalizedDeals(products, profile, limit, searchTerm),
    continueShoppingProducts: (products: Product[], limit?: number) => getContinueShoppingProducts(products, profile, limit),
    similarVehicleParts: (products: Product[], currentProduct: Product, limit?: number) =>
      getSimilarVehicleParts(products, currentProduct, profile, limit),
    completeRepairProducts: (products: Product[], currentProduct: Product, limit?: number) =>
      getCompleteRepairProducts(products, currentProduct, profile, limit),
    frequentlyBoughtTogetherProducts: (products: Product[], currentProduct: Product, limit?: number) =>
      getFrequentlyBoughtTogetherProducts(products, currentProduct, profile, limit),
    analytics: (products?: Product[]) => getRecommendationAnalytics(profile, products),
  }), [profile, rank, track]);
}
