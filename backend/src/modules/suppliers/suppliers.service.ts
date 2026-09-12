import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll() {
    const withBrands = await this.supabase
      .from('suppliers')
      .select('*, products:products(count), brands:brands(count)')
      .order('name');

    const result = withBrands.error
      ? await this.supabase.from('suppliers').select('*, products:products(count)').order('name')
      : withBrands;

    if (result.error) throw result.error;

    return (result.data ?? []).map((row) => {
      const { products, brands, ...supplier } = row as typeof row & {
        products?: Array<{ count: number }> | null;
        brands?: Array<{ count: number }> | null;
      };
      return {
        ...supplier,
        product_count: products?.[0]?.count ?? 0,
        brand_count: brands?.[0]?.count ?? 0,
      };
    });
  }

  async create(body: CreateSupplierDto) {
    const { data, error } = await this.supabase.from('suppliers').insert(body).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, body: UpdateSupplierDto) {
    const { data, error } = await this.supabase
      .from('suppliers')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Proveedor no encontrado');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}
