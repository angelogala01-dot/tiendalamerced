import type { Product, ProductVariant } from '@/types';

export type VariantDraft = {
  key: string;
  id?: string;
  size: string;
  color: string;
  stock_quantity: string;
  barcode: string;
};

export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function variantLabel(variant: Pick<ProductVariant, 'size' | 'color'> | VariantDraft) {
  return [variant.size ? `Talla ${variant.size}` : null, variant.color]
    .filter(Boolean)
    .join(' · ');
}

export function activeVariants(product: Product) {
  return (product.variants ?? []).filter((variant) => variant.is_active !== false);
}

export function draftsFromProduct(product: Product): VariantDraft[] {
  return (product.variants ?? []).map((variant) => ({
    key: variant.id,
    id: variant.id,
    size: variant.size ?? '',
    color: variant.color ?? '',
    stock_quantity: String(variant.stock_quantity ?? 0),
    barcode: variant.barcode ?? '',
  }));
}

export function emptyDraft(): VariantDraft {
  return {
    key: `new-${crypto.randomUUID()}`,
    size: '',
    color: '',
    stock_quantity: '0',
    barcode: '',
  };
}
