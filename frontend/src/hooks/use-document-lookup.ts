'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@/hooks/use-api';

export type IdentityLookup = {
  kind: 'dni' | 'ruc';
  document_number: string;
  name: string;
  address?: string;
  status?: string;
  condition?: string;
  district?: string;
  province?: string;
  department?: string;
};

export function useDocumentLookup(
  kind: 'dni' | 'ruc',
  documentNumber: string,
  onFound: (data: IdentityLookup) => void,
) {
  const { api } = useApi();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  const lookup = useCallback(
    async (raw: string) => {
      const digits = raw.replace(/\D/g, '');
      const expected = kind === 'ruc' ? 11 : 8;
      if (digits.length !== expected) {
        setStatus('idle');
        setMessage('');
        return null;
      }
      setStatus('loading');
      setMessage(kind === 'ruc' ? 'Consultando SUNAT…' : 'Consultando RENIEC…');
      try {
        const data = await api<IdentityLookup>(`/identity/${kind}/${digits}`);
        setStatus('ok');
        setMessage(
          kind === 'ruc' && (data.status || data.condition)
            ? `${data.name} · ${data.status ?? ''} ${data.condition ?? ''}`.trim()
            : data.name,
        );
        onFoundRef.current(data);
        return data;
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'No se pudo consultar el documento');
        return null;
      }
    },
    [api, kind],
  );

  useEffect(() => {
    const digits = documentNumber.replace(/\D/g, '');
    const expected = kind === 'ruc' ? 11 : 8;
    if (digits.length !== expected) {
      setStatus('idle');
      setMessage('');
      return;
    }
    const timer = window.setTimeout(() => {
      void lookup(digits);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [documentNumber, kind, lookup]);

  return { status, message, lookup };
}
