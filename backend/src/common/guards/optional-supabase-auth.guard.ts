import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseClient } from '../../supabase/create-supabase-client';

@Injectable()
export class OptionalSupabaseAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.slice(7);
    const anonKey =
      this.config.get<string>('SUPABASE_ANON_KEY') ||
      this.config.get<string>('SUPABASE_PUBLISHABLE_KEY');
    const url = this.config.get<string>('SUPABASE_URL');
    if (!anonKey || !url) return true;

    const supabase = createSupabaseClient(url, anonKey);
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      request.user = data.user;
    }
    return true;
  }
}
