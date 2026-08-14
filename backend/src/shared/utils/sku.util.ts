import { slugify } from './string.util';

/** Código corto derivado del slug (ej. "la-costena" → "LACO") */
export function toEntityCode(slug: string, length = 4): string {
  const normalized = slugify(slug).replace(/-/g, '').toUpperCase();
  if (!normalized) return 'GEN';
  return normalized.slice(0, length).padEnd(Math.min(length, normalized.length), normalized.slice(-1));
}

/** Formato: {CATEGORIA}-{SECUENCIA}-{MARCA} → ALIM-0001-LACO */
export function formatSku(categorySlug: string, brandSlug: string, sequence: number): string {
  const cat = toEntityCode(categorySlug);
  const brand = toEntityCode(brandSlug);
  const seq = String(sequence).padStart(4, '0');
  return `${cat}-${seq}-${brand}`;
}

export const SKU_PATTERN = /^[A-Z0-9]{2,6}-\d{4}-[A-Z0-9]{2,6}$/;

export function isValidSkuFormat(sku: string): boolean {
  return SKU_PATTERN.test(sku.trim().toUpperCase());
}
