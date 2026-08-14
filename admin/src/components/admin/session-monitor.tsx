'use client';

import { useEffect } from 'react';
import { useApi } from '@/hooks/use-api';

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function SessionMonitor() {
  const { getToken } = useApi();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await getToken();
      } catch {
        window.location.href = '/login?reason=session_expired';
      }
    }, SESSION_MAX_AGE_MS / 4);

    return () => clearInterval(interval);
  }, [getToken]);

  return null;
}
