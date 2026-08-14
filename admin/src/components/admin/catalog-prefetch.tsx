'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';

/** Precarga catálogos compartidos para que Productos/Ventas/Inventario abran más rápido. */
export function CatalogPrefetch() {
  const { api } = useApi();

  useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Array<{ id: string; name: string; slug: string }>>('/categories'),
    staleTime: 5 * 60 * 1000,
  });

  useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => api<Array<{ id: string; name: string; slug: string }>>('/brands'),
    staleTime: 5 * 60 * 1000,
  });

  return null;
}
