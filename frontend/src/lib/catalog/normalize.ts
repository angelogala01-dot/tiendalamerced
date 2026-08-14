import type { Brand, Category, Product } from '@/types';

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_ALIASES: Record<string, string> = {
  calzado: 'Calzado',
  footwear: 'Calzado',
  shoes: 'Calzado',
  shoe: 'Calzado',
  zapatos: 'Calzado',
  zapatillas: 'Calzado',
  ropa: 'Ropa',
  clothing: 'Ropa',
  clothes: 'Ropa',
  apparel: 'Ropa',
  accesorios: 'Accesorios',
  accessories: 'Accesorios',
  accessory: 'Accesorios',
  medias: 'Medias',
  socks: 'Medias',
  sock: 'Medias',
};

type CategoryLike = {
  name?: string | null;
  slug?: string | null;
} | null | undefined;

type BrandLike = {
  name?: string | null;
  slug?: string | null;
} | null | undefined;

export function looksLikeId(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (UUID_LIKE.test(trimmed)) return true;
  return trimmed.length >= 8 && /^[0-9a-f-]+$/i.test(trimmed) && trimmed.includes('-');
}

function translateCategoryKey(value: string): string | null {
  const key = value.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? null;
}

function humanizeSlug(slug: string): string {
  const cleaned = slug.trim().replace(/[-_]+/g, ' ');
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

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

export function getBrandLabel(brand: Brand | BrandLike | string | null | undefined): string {
  if (!brand) return '';
  if (typeof brand === 'string') {
    return looksLikeId(brand) ? '' : brand.trim();
  }
  if (typeof brand !== 'object') return '';
  const name = brand.name?.trim() || '';
  if (name && !looksLikeId(name)) return name;
  const slug = brand.slug?.trim() || '';
  if (slug && !looksLikeId(slug)) return humanizeSlug(slug);
  return '';
}

export function getCategoryLabel(category: Category | CategoryLike | string | null | undefined): string {
  if (!category) return '';
  if (typeof category === 'string') {
    if (looksLikeId(category)) return '';
    return translateCategoryKey(category) ?? category.trim();
  }
  if (typeof category !== 'object') return '';

  const slug = category.slug?.trim() || '';
  const fromSlug = slug ? translateCategoryKey(slug) : null;
  if (fromSlug) return fromSlug;

  const name = category.name?.trim() || '';
  const fromName = name ? translateCategoryKey(name) : null;
  if (fromName) return fromName;

  if (name && !looksLikeId(name)) return name;
  if (slug && !looksLikeId(slug)) return humanizeSlug(slug);
  return '';
}
