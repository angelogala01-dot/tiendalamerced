import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { sanitizeSearchTerm } from '../../shared/utils/string.util';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll(search?: string) {
    let query = this.supabase.from('customers').select('*').order('full_name');
    if (search) {
      const term = sanitizeSearchTerm(search);
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*, sales:sales(*), orders:orders(*)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Cliente no encontrado');
    return data;
  }

  async create(dto: CreateCustomerDto) {
    const { data, error } = await this.supabase.from('customers').insert(dto).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Cliente no encontrado');
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Cliente no encontrado');
    return data;
  }
}
