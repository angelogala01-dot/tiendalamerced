export interface StoreSettings {
  currency: string;
  tax_rate: number;
  shipping_flat: number;
  free_shipping_min: number;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: 'PEN',
  tax_rate: 18,
  shipping_flat: 15,
  free_shipping_min: 200,
};

/** Los precios de catálogo ya incluyen IGV; el impuesto solo se desglosa para registro. */
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
  return { subtotal, discount, tax, shipping_cost: shipping, total };
}

export function calculatePromotionDiscount(
  subtotal: number,
  promo: { discount_type: string; discount_value: number; min_purchase?: number },
): number {
  const minPurchase = Number(promo.min_purchase ?? 0);
  if (subtotal < minPurchase) return 0;

  if (promo.discount_type === 'percentage') {
    return Math.round(subtotal * (Number(promo.discount_value) / 100) * 100) / 100;
  }

  return Math.min(Number(promo.discount_value), subtotal);
}
