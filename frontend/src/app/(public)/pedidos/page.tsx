'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronDown, FileText, ShoppingBag } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OrderReceipt } from '@/components/public/order-receipt';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { ORDER_STATUS_LABELS, type OrderSummary } from '@/types/order';
import { cn } from '@/lib/utils';

export default function PedidosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { api } = useApi();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => api<{ data: OrderSummary[] }>('/orders/my'),
    enabled: !!user,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Cargando sesión…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>
        <p className="text-muted-foreground mb-6">Inicia sesión para ver tu historial de compras.</p>
        <Link
          href={`${PUBLIC_ROUTES.LOGIN}?redirect=${encodeURIComponent(PUBLIC_ROUTES.ORDERS)}`}
          className={cn(buttonVariants())}
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar tus pedidos';
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>
        <p className="text-destructive mb-6">{message}</p>
        <button type="button" className={cn(buttonVariants())} onClick={() => void refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const orders = data?.data ?? [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Tu historial</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mis pedidos</h1>
        <p className="mt-1 text-muted-foreground">
          Consulta el detalle y descarga el comprobante de cada compra
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : !orders.length ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">Aún no tienes pedidos registrados.</p>
          <Link href={PUBLIC_ROUTES.CATALOG} className={cn(buttonVariants())}>
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Lista de pedidos">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const confirmationHref = `${PUBLIC_ROUTES.ORDER_CONFIRMATION}?numero=${encodeURIComponent(order.order_number)}`;

            return (
              <li key={order.id}>
                <Card className="overflow-hidden border-0 shadow-md ring-1 ring-border/60">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{order.order_number}</p>
                          <Badge variant="secondary">
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('es-PE', {
                            dateStyle: 'long',
                          })}
                          {' · '}
                          {order.items?.length ?? 0}{' '}
                          {(order.items?.length ?? 0) === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold tabular-nums">
                          S/ {Number(order.total).toFixed(2)}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-5 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="border-t bg-muted/10 p-4">
                        <OrderReceipt
                          order={order}
                          variant="compact"
                          showActions
                          confirmationHref={confirmationHref}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                        <Link
                          href={confirmationHref}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                        >
                          <FileText className="size-4" />
                          Ver comprobante
                        </Link>
                        <Link
                          href={`${PUBLIC_ROUTES.ORDER_TRACK}?numero=${encodeURIComponent(order.order_number)}`}
                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                        >
                          Rastrear pedido
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8">
        <Link href={PUBLIC_ROUTES.ORDER_TRACK} className={cn(buttonVariants({ variant: 'outline' }))}>
          Rastrear un pedido por número
        </Link>
      </div>
    </div>
  );
}
