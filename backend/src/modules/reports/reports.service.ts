import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@Injectable()
export class ReportsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesToday, products, lowStock, ordersPending] = await Promise.all([
      this.supabase
        .from('sales')
        .select('total')
        .gte('created_at', today.toISOString())
        .eq('status', 'completed'),
      this.supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .filter('stock_quantity', 'lte', 'min_stock'),
      this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'processing']),
    ]);

    const salesTotal = salesToday.data?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;

    return {
      salesToday: salesTotal,
      activeProducts: products.count ?? 0,
      lowStockCount: lowStock.count ?? 0,
      pendingOrders: ordersPending.count ?? 0,
    };
  }

  async getTopProducts(limit = 10) {
    const { data, error } = await this.supabase.rpc('get_top_products', { limit_count: limit });
    if (error) {
      const { data: fallback } = await this.supabase
        .from('sale_items')
        .select('product_id, quantity, product:products(name, sku)')
        .limit(100);
      return fallback;
    }
    return data;
  }
}
