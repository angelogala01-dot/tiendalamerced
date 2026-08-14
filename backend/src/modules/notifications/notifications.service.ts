import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { STAFF_ROLES } from '../../shared/constants/roles';

type NotificationType = 'order' | 'stock' | 'promotion' | 'system';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data ?? [];
  }

  async unreadCount(userId: string) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { count: count ?? 0 };
  }

  async markRead(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markAllRead(userId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { ok: true };
  }

  async notifyStaff(
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ) {
    try {
      const { data: staff, error } = await this.supabase
        .from('profiles')
        .select('id')
        .in('role', STAFF_ROLES)
        .eq('is_active', true);

      if (error || !staff?.length) return;

      const rows = staff.map((profile) => ({
        user_id: profile.id,
        type,
        title,
        message,
        data,
      }));

      const { error: insertError } = await this.supabase.from('notifications').insert(rows);
      if (insertError) {
        this.logger.warn(`No se pudieron crear avisos: ${insertError.message}`);
      }
    } catch (err) {
      this.logger.warn(
        `Aviso al personal omitido: ${err instanceof Error ? err.message : 'error'}`,
      );
    }
  }

  async notifyLowStock(product: {
    id: string;
    name: string;
    sku?: string;
    stock_quantity: number;
    min_stock: number;
  }) {
    if (Number(product.stock_quantity) > Number(product.min_stock)) return;

    await this.notifyStaff(
      'stock',
      'Stock bajo',
      `${product.name} quedó en ${product.stock_quantity} unidades (mínimo ${product.min_stock}).`,
      { product_id: product.id, sku: product.sku },
    );
  }
}
