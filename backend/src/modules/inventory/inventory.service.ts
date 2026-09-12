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
      .select('*, product:products(id, sku, name), variant:product_variants(id, size, color)')
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
      variant_id?: string;
      movement_type: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      notes?: string;
    },
    userId?: string,
  ) {
    if (body.variant_id) {
      const { data: variant, error: variantError } = await this.supabase
        .from('product_variants')
        .select('id, stock_quantity, size, color, product:products(id, min_stock, name, sku)')
        .eq('id', body.variant_id)
        .eq('product_id', body.product_id)
        .single();
      if (variantError || !variant) throw new BadRequestException('Variante no encontrada');

      const stockBefore = Number(variant.stock_quantity);
      let stockAfter = stockBefore;
      if (body.movement_type === 'entry') stockAfter = stockBefore + body.quantity;
      else if (body.movement_type === 'exit') stockAfter = stockBefore - body.quantity;
      else stockAfter = body.quantity;
      if (stockAfter < 0) throw new BadRequestException('Stock insuficiente');

      await this.supabase
        .from('product_variants')
        .update({ stock_quantity: stockAfter })
        .eq('id', body.variant_id);

      const { data, error } = await this.supabase
        .from('inventory_movements')
        .insert({
          product_id: body.product_id,
          variant_id: body.variant_id,
          movement_type: body.movement_type,
          quantity: body.quantity,
          notes: body.notes,
          created_by: userId,
          stock_before: stockBefore,
          stock_after: stockAfter,
        })
        .select()
        .single();
      if (error) throw error;

      const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
      const minStock = Number(product?.min_stock ?? 0);
      if (stockAfter <= minStock && stockBefore > minStock) {
        await this.notifications.notifyLowStock({
          id: body.product_id,
          name: product?.name ?? 'Producto',
          sku: product?.sku ?? '',
          stock_quantity: stockAfter,
          min_stock: minStock,
        });
      }
      return data;
    }

    const { data: variants } = await this.supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', body.product_id)
      .eq('is_active', true)
      .limit(1);
    if (variants?.length) {
      throw new BadRequestException('Este producto tiene tallas/colores. Elige una variante.');
    }
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
