import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@Injectable()
export class AuditService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  findAll(params?: { module?: string; userId?: string; limit?: number; page?: number }) {
    const limit = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from('audit_logs')
      .select('*, user:profiles(id, full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params?.module) query = query.eq('module', params.module);
    if (params?.userId) query = query.eq('user_id', params.userId);

    return query;
  }
}
