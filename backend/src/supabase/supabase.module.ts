import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

function resolveSupabaseKey(config: ConfigService): { key: string; isServiceRole: boolean } {
  const serviceKey = [
    config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    config.get<string>('SUPABASE_SECRET_KEY'),
  ]
    .map((v) => v?.trim())
    .find(Boolean);

  if (serviceKey) {
    return { key: serviceKey, isServiceRole: true };
  }

  const anonKey = [
    config.get<string>('SUPABASE_ANON_KEY'),
    config.get<string>('SUPABASE_PUBLISHABLE_KEY'),
  ]
    .map((v) => v?.trim())
    .find(Boolean);

  if (anonKey) {
    return { key: anonKey, isServiceRole: false };
  }

  throw new Error(
    'Supabase no configurado en backend/.env. Añade SUPABASE_SECRET_KEY (Supabase → Settings → API → secret key).',
  );
}

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient => {
        const logger = new Logger('SupabaseModule');
        const url = config.getOrThrow<string>('SUPABASE_URL').trim();
        const { key, isServiceRole } = resolveSupabaseKey(config);

        if (!isServiceRole) {
          logger.warn(
            'Usando publishable/anon key — añade SUPABASE_SECRET_KEY en backend/.env para operaciones admin completas.',
          );
        }

        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
