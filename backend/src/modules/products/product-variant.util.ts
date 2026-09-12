import { slugify } from '../../shared/utils/string.util';

export type VariantLike = {
  id?: string;
  size?: string | null;
  color?: string | null;
  stock_quantity?: number;
  is_active?: boolean;
};

export const VARIANT_EMBED =
  'variants:product_variants(id, sku, size, color, stock_quantity, barcode, is_active)';

export function variantLabel(variant: VariantLike) {
  return [variant.size ? `Talla ${variant.size}` : null, variant.color]
    .filter(Boolean)
    .join(' · ');
}

export function activeVariants<T extends VariantLike>(variants?: T[] | null) {
  return (variants ?? []).filter((variant) => variant.is_active !== false);
}

export function buildVariantSku(
  productSku: string,
  size?: string | null,
  color?: string | null,
) {
  const bits = [productSku.trim().toUpperCase()];
  if (size?.trim()) {
    bits.push(size.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8));
  }
  if (color?.trim()) {
    bits.push(slugify(color).replace(/-/g, '').toUpperCase().slice(0, 8));
  }
  return bits.filter(Boolean).join('-');
}
