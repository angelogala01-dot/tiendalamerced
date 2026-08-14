'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/client';

export function useApi() {
  const getToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
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
