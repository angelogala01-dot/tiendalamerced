import { createClient } from '@/lib/supabase/server';
import { normalizeProduct } from '@/lib/catalog/normalize';
import type { Brand, Category, Product, Promotion } from '@/types';

const PRODUCT_SELECT =
  'id, sku, slug, name, description, sale_price, cost_price, stock_quantity, min_stock, is_active, category:categories(id, name, slug), brand:brands(id, name, slug), images:product_images(id, url, is_primary, storage_path), variants:product_variants(id, sku, size, color, stock_quantity, is_active)';

function sanitizeSearch(raw?: string) {
  if (!raw) return '';
  return raw.replace(/[%_,()]/g, ' ').trim().slice(0, 80);
}

export async function getHomeCatalog() {
  try {
    const catalog = await getStoreCatalog({ limit: 8 });
    const supabase = await createClient();
    const { data: promotions } = await supabase
      .from('promotions')
      .select('id, name, description, discount_type, discount_value, start_date, end_date')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .limit(3);

    return {
      products: catalog.data,
      categories: catalog.categories,
      promotions: (promotions ?? []) as Promotion[],
    };
  } catch (error) {
    console.error('[catalog] home unavailable', error);
    return { products: [], categories: [], promotions: [] as Promotion[] };
  }
}

export async function getStoreCatalog(opts?: {
  search?: string;
  categorySlug?: string;
  brandSlug?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  const limit = opts?.limit ?? 48;

  const [categoriesRes, brandsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, description, image_url, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('brands').select('id, name, slug, logo_url').order('name', { ascending: true }),
  ]);

  const categories = (categoriesRes.data ?? []) as Category[];
  const brands = (brandsRes.data ?? []) as Brand[];

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  const q = sanitizeSearch(opts?.search);
  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  const category = categories.find(
    (c) => c.id === opts?.categorySlug || c.slug === opts?.categorySlug,
  );
  if (category) query = query.eq('category_id', category.id);

  const brand = brands.find((b) => b.id === opts?.brandSlug || b.slug === opts?.brandSlug);
  if (brand) query = query.eq('brand_id', brand.id);

  const productsRes = await query;
  const data = (productsRes.data ?? []).map((row) => normalizeProduct(row as unknown as Product));

  return {
    data,
    total: productsRes.count ?? data.length,
    categories,
    brands,
  };
}

export async function getActiveCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as Category[];
}

export async function getActivePromotions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('promotions')
    .select('id, name, description, discount_type, discount_value, start_date, end_date')
    .eq('is_active', true)
    .gte('end_date', new Date().toISOString());
  return (data ?? []) as Promotion[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeParam(raw: string) {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export async function getProductBySlug(raw: string) {
  const slug = decodeParam(raw).slice(0, 180);
  if (!slug) return null;

  const fromDb = await fetchProductFromSupabase(slug);
  if (fromDb) return fromDb;

  try {
    const { productsService } = await import('@/services/catalog.service');
    return await productsService.getById(slug);
  } catch {
    return null;
  }
}

async function fetchProductFromSupabase(slug: string) {
  const supabase = await createClient();
  const isUuid = UUID_RE.test(slug);

  const byKey = isUuid
    ? await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_active', true)
        .eq('id', slug)
        .maybeSingle()
    : await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_active', true)
        .eq('slug', slug)
        .maybeSingle();

  if (byKey.data) return normalizeProduct(byKey.data as unknown as Product);

  if (!isUuid) {
    const bySku = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .ilike('sku', slug)
      .maybeSingle();
    if (bySku.data) return normalizeProduct(bySku.data as unknown as Product);
  }

  return null;
}
