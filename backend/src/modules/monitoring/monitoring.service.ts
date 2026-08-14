import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

type ErrorReport = {
  message: string;
  stack?: string;
  source: 'frontend' | 'admin' | 'backend';
  url?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class MonitoringService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async reportError(payload: ErrorReport, userId?: string) {
    const { error } = await this.supabase.from('audit_logs').insert({
      user_id: userId ?? null,
      action: 'client_error',
      module: 'monitoring',
      entity_type: payload.source,
      new_data: {
        message: payload.message,
        stack: payload.stack,
        url: payload.url,
        userAgent: payload.userAgent,
        metadata: payload.metadata ?? {},
      },
    });

    if (error) throw error;
    return { logged: true };
  }
}
