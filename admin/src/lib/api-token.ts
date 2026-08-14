import { createClient } from '@/lib/supabase/client';

let cachedToken: string | null = null;
let cachedExpiryMs = 0;

export function clearApiTokenCache() {
  cachedToken = null;
  cachedExpiryMs = 0;
}

/** Reutiliza el access token en memoria para evitar getSession() en cada request. */
export async function getApiAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedExpiryMs > now + 60_000) {
    return cachedToken;
  }

  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    clearApiTokenCache();
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }

  cachedToken = session.access_token;
  cachedExpiryMs = session.expires_at
    ? session.expires_at * 1000
    : now + 55 * 60 * 1000;

  return cachedToken;
}
