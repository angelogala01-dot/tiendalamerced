import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly notifications: NotificationsService,
  ) {}

  async getMovements(productId?: string) {
    let query = this.supabase
      .from('inventory_movements')
      .select('*, product:products(id, sku, name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async registerMovement(
    body: {
      product_id: string;
      movement_type: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      notes?: string;
    },
    userId?: string,
  ) {
    const { data: product, error: productError } = await this.supabase
      .from('products')
      .select('stock_quantity, min_stock, name, sku')
      .eq('id', body.product_id)
      .single();

    if (productError) throw productError;

    const stockBefore = product.stock_quantity;
    let stockAfter = stockBefore;

    if (body.movement_type === 'entry') stockAfter = stockBefore + body.quantity;
    else if (body.movement_type === 'exit') stockAfter = stockBefore - body.quantity;
    else stockAfter = body.quantity;

    if (stockAfter < 0) throw new BadRequestException('Stock insuficiente');

    await this.supabase
      .from('products')
      .update({ stock_quantity: stockAfter })
      .eq('id', body.product_id);

    const { data, error } = await this.supabase
      .from('inventory_movements')
      .insert({
        ...body,
        created_by: userId,
        stock_before: stockBefore,
        stock_after: stockAfter,
      })
      .select()
      .single();

    if (error) throw error;

    if (
      stockAfter <= Number(product.min_stock ?? 0) &&
      stockBefore > Number(product.min_stock ?? 0)
    ) {
      await this.notifications.notifyLowStock({
        id: body.product_id,
        name: product.name,
        sku: product.sku,
        stock_quantity: stockAfter,
        min_stock: Number(product.min_stock ?? 0),
      });
    }

    return data;
  }
}
