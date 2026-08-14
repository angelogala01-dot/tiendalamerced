export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Escapa caracteres especiales de ILIKE y limita longitud para búsquedas seguras */
export function sanitizeSearchTerm(search: string, maxLength = 100): string {
  return search
    .trim()
    .slice(0, maxLength)
    .replace(/[%_\\]/g, '\\$&');
}
