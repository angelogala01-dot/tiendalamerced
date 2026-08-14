import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import type { Promotion } from '@/types';

export type WelcomeEligibility = {
  eligible: boolean;
  promotion: Promotion | null;
  reason: 'no_active_promotion' | 'already_used' | null;
};

export function calculateWelcomeDiscount(
  subtotal: number,
  promotion: Promotion | null | undefined,
): number {
  if (!promotion || subtotal < Number(promotion.min_purchase ?? 0)) return 0;

  if (promotion.discount_type === 'percentage') {
    return Math.round(subtotal * (Number(promotion.discount_value) / 100) * 100) / 100;
  }

  return Math.min(Number(promotion.discount_value), subtotal);
}

export function useWelcomeDiscount(subtotal: number) {
  const { user, isLoading: authLoading } = useAuth();
  const { api } = useApi();

  const { data, isLoading: promoLoading } = useQuery({
    queryKey: ['welcome-eligibility', user?.id],
    queryFn: () => api<WelcomeEligibility>('/promotions/welcome-eligibility'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const discount =
    data?.eligible && data.promotion
      ? calculateWelcomeDiscount(subtotal, data.promotion)
      : 0;

  const minPurchase = Number(data?.promotion?.min_purchase ?? 0);
  const missingForPromo =
    data?.eligible && data.promotion && subtotal < minPurchase
      ? minPurchase - subtotal
      : 0;

  return {
    isLoading: authLoading || (!!user && promoLoading),
    eligible: data?.eligible ?? false,
    promotion: data?.promotion ?? null,
    discount,
    missingForPromo,
    reason: data?.reason ?? null,
  };
}
