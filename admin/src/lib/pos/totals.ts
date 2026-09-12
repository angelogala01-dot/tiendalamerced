/** Los precios de mostrador ya incluyen IGV; el impuesto solo se desglosa. */
export function calculatePosTotals(subtotal: number, taxRate: number, discount = 0) {
  const appliedDiscount = Math.min(Math.max(0, discount), Math.max(0, subtotal));
  const total = Math.round((subtotal - appliedDiscount) * 100) / 100;
  const tax =
    total <= 0 || taxRate <= 0
      ? 0
      : Math.round(total * (taxRate / (100 + taxRate)) * 100) / 100;
  return { subtotal, discount: appliedDiscount, tax, total };
}
