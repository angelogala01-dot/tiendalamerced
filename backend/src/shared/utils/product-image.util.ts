const BUCKET = 'product-images';

export function buildProductImagePublicUrl(
  supabaseUrl: string,
  storagePath?: string | null,
  fallbackUrl?: string | null,
): string {
  if (storagePath?.trim()) {
    const base = supabaseUrl.replace(/\/$/, '');
    return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  }
  return fallbackUrl?.trim() ?? '';
}

export function isAllowedImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
