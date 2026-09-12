'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  clearBrokenAuthSession,
  isInvalidRefreshTokenError,
} from '@/lib/supabase/auth-session';
import { apiFetch } from '@/lib/api/client';

export function useApi() {
  const getToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error && isInvalidRefreshTokenError(error)) {
      await clearBrokenAuthSession(supabase);
      throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    }
    if (error || !session?.access_token) {
      throw new Error('Inicia sesión para continuar.');
    }
    return session.access_token;
  }, []);

  const api = useCallback(
    async <T>(path: string, options: RequestInit = {}) => {
      const token = await getToken();
      return apiFetch<T>(path, { ...options, token });
    },
    [getToken],
  );

  return { api, getToken };
}
