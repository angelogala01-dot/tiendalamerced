import type { Brand, Category, Product } from '@/types';

export function normalizeRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (relation == null) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

export function normalizeProduct(product: Product): Product {
  return {
    ...product,
    category: normalizeRelation(product.category) ?? undefined,
    brand: normalizeRelation(product.brand) ?? undefined,
  };
}

export function getBrandLabel(brand: Brand | null | undefined): string {
  if (!brand) return '—';
  return brand.name?.trim() || 'Sin nombre';
}

export function getCategoryLabel(category: Category | null | undefined): string {
  if (!category) return '—';
  return category.name?.trim() || 'Sin nombre';
}
