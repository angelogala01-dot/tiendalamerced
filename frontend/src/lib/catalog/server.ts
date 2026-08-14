import { createClient } from '@/lib/supabase/server';
import { normalizeProduct } from '@/lib/catalog/normalize';
import type { Category, Product, Promotion } from '@/types';

export async function getHomeCatalog() {
  const supabase = await createClient();

  const [productsRes, categoriesRes, promotionsRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, sku, slug, name, description, sale_price, cost_price, stock_quantity, min_stock, is_active, category:categories(id, name, slug), brand:brands(id, name, slug), images:product_images(id, url, is_primary, storage_path)',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('categories')
      .select('id, name, slug, description, image_url, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('promotions')
      .select('id, name, description, discount_type, discount_value, start_date, end_date')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .limit(3),
  ]);

  const products = (productsRes.data ?? []).map((row) =>
    normalizeProduct(row as unknown as Product),
  );

  return {
    products,
    categories: (categoriesRes.data ?? []) as Category[],
    promotions: (promotionsRes.data ?? []) as Promotion[],
  };
}
