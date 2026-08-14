import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll() {
    const { data, error } = await this.supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data;
  }

  async create(body: CreateCategoryDto) {
    const { data, error } = await this.supabase.from('categories').insert(body).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, body: UpdateCategoryDto) {
    const { data, error } = await this.supabase
      .from('categories')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Categoría no encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}
