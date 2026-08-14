import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '../../shared/utils/order-totals.util';

@Injectable()
export class SettingsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll() {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .order('key');

    if (error) throw error;
    return data;
  }

  async findOne(key: string) {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error) throw new NotFoundException('Configuración no encontrada');
    return data;
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'store')
      .maybeSingle();

    if (error || !data?.value) return DEFAULT_STORE_SETTINGS;

    const value = data.value as Record<string, unknown>;
    return {
      currency: String(value.currency ?? DEFAULT_STORE_SETTINGS.currency),
      tax_rate: Number(value.tax_rate ?? DEFAULT_STORE_SETTINGS.tax_rate),
      shipping_flat: Number(value.shipping_flat ?? DEFAULT_STORE_SETTINGS.shipping_flat),
      free_shipping_min: Number(value.free_shipping_min ?? DEFAULT_STORE_SETTINGS.free_shipping_min),
    };
  }

  async upsert(key: string, value: Record<string, unknown>, userId: string, description?: string) {
    const { data, error } = await this.supabase
      .from('app_settings')
      .upsert(
        {
          key,
          value,
          description,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
