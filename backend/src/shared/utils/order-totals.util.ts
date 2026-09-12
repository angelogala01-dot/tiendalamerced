export interface StoreSettings {
  currency: string;
  tax_rate: number;
  shipping_flat: number;
  free_shipping_min: number;
  company_name: string;
  company_phone: string;
  pickup_address: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: 'PEN',
  tax_rate: 18,
  shipping_flat: 15,
  free_shipping_min: 200,
  company_name: 'La Merced PyK',
  company_phone: '',
  pickup_address: 'Tienda La Merced PyK',
};

/** Los precios de catálogo ya incluyen IGV; el impuesto solo se desglosa para registro. */
export function extractIncludedTax(gross: number, taxRate: number) {
  if (gross <= 0 || taxRate <= 0) return 0;
  return Math.round(gross * (taxRate / (100 + taxRate)) * 100) / 100;
}

export function calculatePosTotals(subtotal: number, taxRate: number, discount = 0) {
  const appliedDiscount = Math.min(Math.max(0, discount), Math.max(0, subtotal));
  const total = Math.round((subtotal - appliedDiscount) * 100) / 100;
  return {
    subtotal,
    discount: appliedDiscount,
    tax: extractIncludedTax(total, taxRate),
    total,
  };
}

export function calculateOrderTotals(
  subtotal: number,
  settings: StoreSettings,
  discount = 0,
  pickup = false,
) {
  const { tax, total: discountedSubtotal, discount: appliedDiscount } = calculatePosTotals(
    subtotal,
    settings.tax_rate,
    discount,
  );
  const shipping = pickup
    ? 0
    : discountedSubtotal >= settings.free_shipping_min
      ? 0
      : settings.shipping_flat;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;
  return { subtotal, discount: appliedDiscount, tax, shipping_cost: shipping, total };
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
