'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { ADMIN_ROUTES } from '@/constants/routes';
import type { Product } from '@/types';

type CatalogPage = 'products' | 'brands' | 'inventory';

export function CatalogGuidance({ page }: { page: CatalogPage }) {
  const { api } = useApi();

  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Array<{ id: string }>>('/categories'),
    enabled: page === 'products',
    staleTime: 5 * 60 * 1000,
  });

  const brands = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => api<Array<{ id: string }>>('/brands'),
    enabled: page === 'products',
    staleTime: 5 * 60 * 1000,
  });

  const suppliers = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => api<Array<{ id: string }>>('/suppliers'),
    enabled: page === 'brands',
    staleTime: 5 * 60 * 1000,
  });

  const products = useQuery({
    queryKey: ['admin-products', 'lite'],
    queryFn: () => api<{ data: Product[] }>('/products?lite=true&limit=200'),
    enabled: page === 'inventory',
    staleTime: 5 * 60 * 1000,
  });

  if (page === 'products' && categories.isSuccess && (categories.data?.length ?? 0) === 0) {
    return (
      <Hint href={ADMIN_ROUTES.CATEGORIES} action="Crear categoría">
        Crea al menos una categoría antes de cargar productos. Así el catálogo de la tienda queda ordenado.
      </Hint>
    );
  }

  if (page === 'products' && brands.isSuccess && (brands.data?.length ?? 0) === 0) {
    return (
      <Hint href={ADMIN_ROUTES.BRANDS} action="Crear marca">
        Aún no hay marcas. Cada producto necesita una marca para mostrarse bien en la tienda.
      </Hint>
    );
  }

  if (page === 'brands' && suppliers.isSuccess && (suppliers.data?.length ?? 0) === 0) {
    return (
      <Hint href={ADMIN_ROUTES.SUPPLIERS} action="Crear proveedor">
        Puedes crear proveedores y luego asignarlos a cada marca. No es obligatorio para el primer alta.
      </Hint>
    );
  }

  if (page === 'inventory' && products.isSuccess && (products.data?.data?.length ?? 0) === 0) {
    return (
      <Hint href={ADMIN_ROUTES.PRODUCTS} action="Ir a productos">
        No hay productos para mover stock. Crea el SKU primero y después registra entradas en almacén.
      </Hint>
    );
  }

  return null;
}

function Hint({
  href,
  action,
  children,
}: {
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <span>{children}</span>
      </p>
      <Link
        href={href}
        className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-center text-xs font-semibold text-background hover:opacity-90"
      >
        {action}
      </Link>
    </div>
  );
}
