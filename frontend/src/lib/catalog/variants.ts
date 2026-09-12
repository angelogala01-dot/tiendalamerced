import type { Product, ProductVariant } from '@/types';

export function cartLineKey(item: { productId: string; variantId?: string | null }) {
  return item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
}

export function variantLabel(variant: Pick<ProductVariant, 'size' | 'color'>) {
  return [variant.size ? `Talla ${variant.size}` : null, variant.color]
    .filter(Boolean)
    .join(' · ');
}

export function activeVariants(product: Product) {
  return (product.variants ?? []).filter((variant) => variant.is_active !== false);
}

export function productHasVariants(product: Product) {
  return activeVariants(product).length > 0;
}

export function uniqueOptionValues(variants: ProductVariant[], key: 'size' | 'color') {
  const values: string[] = [];
  for (const variant of variants) {
    const value = variant[key]?.trim();
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}
