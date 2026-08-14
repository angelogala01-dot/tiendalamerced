'use client';

import { useCallback } from 'react';
import { clearApiTokenCache, getApiAccessToken } from '@/lib/api-token';
import { apiFetch, apiUpload } from '@/lib/api/client';

export function useApi() {
  const getToken = useCallback(async () => getApiAccessToken(), []);

  const api = useCallback(
    async <T>(path: string, options: RequestInit = {}) => {
      const token = await getToken();
      return apiFetch<T>(path, { ...options, token });
    },
    [getToken],
  );

  const upload = useCallback(
    async <T>(path: string, file: File) => {
      const token = await getToken();
      return apiUpload<T>(path, file, token);
    },
    [getToken],
  );

  return { api, getToken, upload, clearTokenCache: clearApiTokenCache };
}
