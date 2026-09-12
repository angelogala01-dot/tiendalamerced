import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as AuthError).message ?? '') : '';
  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  return (
    /refresh token/i.test(message) ||
    /invalid.?refresh/i.test(message) ||
    code === 'refresh_token_not_found'
  );
}

/** Limpia cookies/sesión local cuando el refresh token ya no sirve. */
export async function clearBrokenAuthSession(supabase: SupabaseClient) {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignorar: el objetivo es dejar de reintentar el token inválido
  }

  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') && key.includes('auth')) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // private mode / storage bloqueado
  }
}
