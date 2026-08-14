import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

type RevenueRow = { total: number };

@Injectable()
export class DashboardService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  private sumRows(rows: RevenueRow[] | null | undefined) {
    return rows?.reduce((acc, r) => acc + Number(r.total), 0) ?? 0;
  }

  private async sumSalesBetween(from: Date, to?: Date) {
    let query = this.supabase
      .from('sales')
      .select('total')
      .gte('created_at', from.toISOString())
      .eq('status', 'completed');

    if (to) query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;
    if (error) throw error;
    return this.sumRows(data);
  }

  private async sumOrdersBetween(from: Date, to?: Date) {
    let query = this.supabase
      .from('orders')
      .select('total')
      .gte('created_at', from.toISOString())
      .neq('status', 'cancelled');

    if (to) query = query.lte('created_at', to.toISOString());

    const { data, error } = await query;
    if (error) throw error;
    return this.sumRows(data);
  }

  private async revenueBetween(from: Date, to?: Date) {
    const [sales, orders] = await Promise.all([
      this.sumSalesBetween(from, to),
      this.sumOrdersBetween(from, to),
    ]);
    return sales + orders;
  }

  private async getLowStockProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, sku, name, stock_quantity, min_stock')
      .eq('is_active', true);

    if (error) throw error;
    return (data ?? []).filter((p) => Number(p.stock_quantity) <= Number(p.min_stock));
  }

  private async getTopProductsForMonth(startOfMonth: Date) {
    const iso = startOfMonth.toISOString();
    const productCounts = new Map<string, { name: string; sku: string; qty: number }>();

    const addItems = (
      items: Array<{
        product_id: string;
        quantity: number;
        product: unknown;
      }> | null,
    ) => {
      items?.forEach((item) => {
        const raw = item.product as unknown;
        const product = (Array.isArray(raw) ? raw[0] : raw) as { name: string; sku: string } | null;
        if (!product) return;

        const existing = productCounts.get(item.product_id);
        if (existing) existing.qty += item.quantity;
        else productCounts.set(item.product_id, { name: product.name, sku: product.sku, qty: item.quantity });
      });
    };

    try {
      const [saleItems, orderItems] = await Promise.all([
        this.supabase
          .from('sale_items')
          .select('product_id, quantity, product:products(name, sku), sale:sales!inner(created_at, status)')
          .gte('sale.created_at', iso)
          .eq('sale.status', 'completed'),
        this.supabase
          .from('order_items')
          .select('product_id, quantity, product:products(name, sku), order:orders!inner(created_at, status)')
          .gte('order.created_at', iso)
          .neq('order.status', 'cancelled'),
      ]);

      addItems(saleItems.data as never);
      addItems(orderItems.data as never);
    } catch {
      const { data: fallback } = await this.supabase
        .from('sale_items')
        .select('product_id, quantity, product:products(name, sku)')
        .limit(100);
      addItems(fallback as never);
    }

    return [...productCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  async getOverview() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      salesToday,
      salesMonth,
      salesLastMonth,
      lowStockAll,
      pendingOrders,
      newCustomers,
      activeProducts,
      topProducts,
    ] = await Promise.all([
      this.revenueBetween(startOfDay),
      this.revenueBetween(startOfMonth),
      this.revenueBetween(startOfLastMonth, endOfLastMonth),
      this.getLowStockProducts(),
      this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'processing']),
      this.supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString()),
      this.supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      this.getTopProductsForMonth(startOfMonth),
    ]);

    const growth =
      salesLastMonth > 0 ? ((salesMonth - salesLastMonth) / salesLastMonth) * 100 : salesMonth > 0 ? 100 : 0;

    return {
      salesToday,
      salesMonth,
      salesGrowthPercent: Math.round(growth * 100) / 100,
      lowStock: lowStockAll.slice(0, 10),
      lowStockCount: lowStockAll.length,
      pendingOrders: pendingOrders.count ?? 0,
      newCustomers: newCustomers.count ?? 0,
      activeProducts: activeProducts.count ?? 0,
      topProducts,
    };
  }
}
