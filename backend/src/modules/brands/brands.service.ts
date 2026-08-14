import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@Injectable()
export class BrandsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll() {
    const { data, error } = await this.supabase.from('brands').select('*').order('name');
    if (error) throw error;
    return data;
  }

  async create(body: { name: string; slug: string }) {
    const { data, error } = await this.supabase.from('brands').insert(body).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, body: { name?: string; slug?: string; is_active?: boolean }) {
    const { data, error } = await this.supabase
      .from('brands')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Marca no encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}
