import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export interface StoreSettings {
  currency: string;
  tax_rate: number;
  shipping_flat: number;
  free_shipping_min: number;
}

const DEFAULT: StoreSettings = {
  currency: 'PEN',
  tax_rate: 18,
  shipping_flat: 15,
  free_shipping_min: 200,
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: () => apiFetch<StoreSettings>('/settings/store'),
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT,
  });
}

/** Precios de catálogo con IGV incluido — no se suma impuesto al total. */
export function calculateOrderTotals(
  subtotal: number,
  settings: StoreSettings,
  discount = 0,
) {
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax =
    Math.round(
      discountedSubtotal * (settings.tax_rate / (100 + settings.tax_rate)) * 100,
    ) / 100;
  const shipping =
    discountedSubtotal >= settings.free_shipping_min ? 0 : settings.shipping_flat;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;
  return { subtotal, discount, tax, shipping, total };
}
