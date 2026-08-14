import type { ProductImage } from '@/types';

const BUCKET = 'product-images';

export function resolveProductImageUrl(
  image: Pick<ProductImage, 'url'> & { storage_path?: string | null },
): string {
  const storagePath = image.storage_path?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

  if (storagePath && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  }

  const url = image.url?.trim();
  if (!url) return '';

  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  if (supabaseUrl && url.includes('/storage/v1/object/public/')) {
    return url;
  }

  return url;
}

export function getPrimaryImageUrl(
  images?: Array<Pick<ProductImage, 'url' | 'is_primary'> & { storage_path?: string | null }>,
): string {
  if (!images?.length) return '';
  const primary = images.find((i) => i.is_primary) ?? images[0];
  return resolveProductImageUrl(primary);
}
