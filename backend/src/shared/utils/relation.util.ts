/** Supabase a veces devuelve relaciones FK como array; normaliza a objeto único */
export function normalizeRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (relation == null) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}
