import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findActive() {
    const { data, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(dto: CreatePromotionDto) {
    const { data, error } = await this.supabase.from('promotions').insert(dto).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const { data, error } = await this.supabase
      .from('promotions')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Promoción no encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('promotions').delete().eq('id', id);
    if (error) throw new NotFoundException('Promoción no encontrada');
    return { deleted: true };
  }

  async getWelcomePromotion() {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .ilike('name', '%bienvenida%')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getWelcomeEligibility(userId: string) {
    const promotion = await this.getWelcomePromotion();
    if (!promotion) {
      return { eligible: false, promotion: null, reason: 'no_active_promotion' as const };
    }

    const { data: customer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (customer) {
      const { count, error } = await this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id);

      if (error) throw error;
      if ((count ?? 0) > 0) {
        return { eligible: false, promotion, reason: 'already_used' as const };
      }
    }

    return { eligible: true, promotion, reason: null };
  }
}
