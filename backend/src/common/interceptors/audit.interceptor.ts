import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const userId = request.user?.id;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !userId) {
      return next.handle();
    }

    const path = request.route?.path ?? request.url;
    const module = path.split('/')[1] ?? 'unknown';

    return next.handle().pipe(
      tap(async (responseBody) => {
        await this.supabase.from('audit_logs').insert({
          user_id: userId,
          action: `${method} ${path}`,
          module,
          entity_type: request.params?.id ? module : null,
          entity_id: request.params?.id ?? null,
          new_data: responseBody ? JSON.parse(JSON.stringify(responseBody)) : null,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
        });
      }),
    );
  }
}
