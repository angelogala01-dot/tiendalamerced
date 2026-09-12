'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { normalizeProduct } from '@/lib/catalog/normalize';
import type { Product } from '@/types';

/** Precarga catálogos compartidos para que Productos/Ventas/Inventario abran al instante. */
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

  useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/suppliers'),
    staleTime: 5 * 60 * 1000,
  });

  useQuery({
    queryKey: ['admin-products', 'lite'],
    queryFn: async () => {
      const res = await api<{ data: Product[] }>('/products?lite=true&limit=200');
      return { data: (res.data ?? []).map(normalizeProduct) };
    },
    staleTime: 5 * 60 * 1000,
  });

  return null;
}
