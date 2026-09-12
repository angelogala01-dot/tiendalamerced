import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';

/**
 * Node 20 no incluye WebSocket nativo; supabase-js lo exige al iniciar Realtime.
 */
export function createSupabaseClient(
  url: string,
  key: string,
  options: SupabaseClientOptions<'public'> = {},
): SupabaseClient {
  return createClient(url, key, {
    ...options,
    realtime: {
      ...options.realtime,
      transport: WebSocket as unknown as WebSocketLikeConstructor,
    },
  });
}
