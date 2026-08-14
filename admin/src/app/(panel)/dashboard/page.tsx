'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  ClipboardList,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import type { DashboardOverview } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ADMIN_ROUTES } from '@/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { api } = useApi();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api<DashboardOverview>('/dashboard/overview'),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const primaryCards = [
    {
      title: 'Ventas hoy',
      value: stats ? `S/ ${stats.salesToday.toFixed(2)}` : '—',
      icon: ShoppingCart,
      accent: 'primary' as const,
      href: ADMIN_ROUTES.SALES,
    },
    {
      title: 'Ventas del mes',
      value: stats ? `S/ ${stats.salesMonth.toFixed(2)}` : '—',
      icon: TrendingUp,
      accent: 'success' as const,
      href: ADMIN_ROUTES.REPORTS,
    },
    {
      title: 'Crecimiento',
      value: stats
        ? `${stats.salesGrowthPercent > 0 ? '+' : ''}${stats.salesGrowthPercent}%`
        : '—',
      icon: TrendingUp,
      accent: 'info' as const,
    },
    {
      title: 'Stock crítico',
      value: stats?.lowStockCount ?? '—',
      icon: AlertTriangle,
      accent: 'warning' as const,
      href: ADMIN_ROUTES.INVENTORY,
    },
  ];

  const secondaryCards = [
    {
      title: 'Pedidos pendientes',
      value: stats?.pendingOrders ?? '—',
      icon: ClipboardList,
      accent: 'chart-2' as const,
      href: ADMIN_ROUTES.ORDERS,
    },
    {
      title: 'Nuevos clientes',
      value: stats?.newCustomers ?? '—',
      icon: Users,
      accent: 'info' as const,
      href: ADMIN_ROUTES.CUSTOMERS,
    },
    {
      title: 'Productos activos',
      value: stats?.activeProducts ?? '—',
      icon: Package,
      accent: 'primary' as const,
      href: ADMIN_ROUTES.PRODUCTS,
    },
  ];

  return (
    <div className="admin-page-enter space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Resumen operativo · ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <section aria-labelledby="kpi-primary-heading">
        <h2 id="kpi-primary-heading" className="sr-only">
          Indicadores principales
        </h2>
        <div className="admin-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {primaryCards.map((card) => (
            <StatCard key={card.title} {...card} isLoading={isLoading} />
          ))}
        </div>
      </section>

      <section aria-labelledby="kpi-secondary-heading">
        <h2 id="kpi-secondary-heading" className="sr-only">
          Indicadores secundarios
        </h2>
        <div className="admin-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {secondaryCards.map((card) => (
            <StatCard key={card.title} {...card} isLoading={isLoading} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {stats ? (
          <Card className="admin-card border-0 py-0">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-base font-semibold">Rendimiento de ventas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              {[
                {
                  label: 'Hoy',
                  value: stats.salesToday,
                  max: Math.max(stats.salesMonth, stats.salesToday, 1),
                  color: 'bg-primary',
                },
                {
                  label: 'Mes',
                  value: stats.salesMonth,
                  max: Math.max(stats.salesMonth, stats.salesToday, 1),
                  color: 'bg-chart-2',
                },
              ].map((row) => (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums">S/ {row.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', row.color)}
                      style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Crecimiento del mes:{' '}
                <span className="font-medium text-foreground">
                  {stats.salesGrowthPercent > 0 ? '+' : ''}
                  {stats.salesGrowthPercent}%
                </span>
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="admin-card border-0 p-5">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : null}
        {stats?.topProducts?.length ? (
          <Card className="admin-card border-0 py-0">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-base font-semibold">Productos más vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/60">
                {stats.topProducts.map((p, i) => {
                  const maxQty = Math.max(...stats.topProducts.map((item) => item.qty), 1);
                  return (
                  <li
                    key={`${p.sku}-${i}`}
                    className="px-5 py-3.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary"
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.sku}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{p.qty} uds.</Badge>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(p.qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="admin-card border-0 p-5">
            <Skeleton className="mb-4 h-5 w-48" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        ) : null}

        {stats?.lowStock?.length ? (
          <Card className="admin-card border-0">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-base font-semibold">Alertas de stock bajo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/60">
                {stats.lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <Badge variant="destructive">
                      {p.stock_quantity} / {p.min_stock}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!stats && !isLoading && (
        <Card className="admin-card border-0 border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {isError
              ? 'No se pudieron cargar los indicadores. Verifica que el backend esté en marcha y vuelve a intentar.'
              : 'Sin datos de ventas todavía. Registra ventas en POS o recibe pedidos web para ver indicadores.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
