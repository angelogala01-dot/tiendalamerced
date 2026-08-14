'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import type { DashboardOverview, TopProductReport } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function normalizeTopProducts(items: TopProductReport[] | null | undefined) {
  if (!items?.length) return [];
  return items.map((item) => {
    const raw = item.product as unknown;
    const product = (Array.isArray(raw) ? raw[0] : raw) as { name: string; sku: string } | null | undefined;
    return {
      name: item.name ?? product?.name ?? '—',
      sku: item.sku ?? product?.sku ?? '—',
      qty: item.qty ?? item.quantity ?? 0,
    };
  });
}

export default function AdminReportesPage() {
  const { api } = useApi();

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['admin-reports-overview'],
    queryFn: () => api<DashboardOverview>('/dashboard/overview'),
  });

  const { data: topRaw, isLoading: loadingTop } = useQuery({
    queryKey: ['admin-reports-top-products'],
    queryFn: () => api<TopProductReport[]>('/reports/top-products'),
  });

  const topProducts = normalizeTopProducts(topRaw);

  const kpiCards = [
    {
      title: 'Ventas hoy',
      value: overview ? `S/ ${overview.salesToday.toFixed(2)}` : '—',
      icon: ShoppingCart,
      accent: 'primary' as const,
    },
    {
      title: 'Ventas del mes',
      value: overview ? `S/ ${overview.salesMonth.toFixed(2)}` : '—',
      icon: TrendingUp,
      accent: 'success' as const,
    },
    {
      title: 'Crecimiento',
      value: overview ? `${overview.salesGrowthPercent}%` : '—',
      icon: BarChart3,
      accent: 'info' as const,
    },
    {
      title: 'Productos activos',
      value: overview?.activeProducts ?? '—',
      icon: Package,
      accent: 'primary' as const,
    },
    {
      title: 'Stock crítico',
      value: overview?.lowStockCount ?? '—',
      icon: Package,
      accent: 'warning' as const,
    },
    {
      title: 'Nuevos clientes',
      value: overview?.newCustomers ?? '—',
      icon: Users,
      accent: 'info' as const,
    },
  ];

  return (
    <div className="admin-page-enter space-y-8">
      <PageHeader title="Reportes" description="Indicadores de negocio e inventario" />

      <section aria-labelledby="reports-kpi-heading">
        <h2 id="reports-kpi-heading" className="sr-only">Indicadores principales</h2>
        <div className="admin-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card) => (
            <StatCard key={card.title} {...card} isLoading={loadingOverview} />
          ))}
        </div>
      </section>

      <DataTableShell
        title="Productos más vendidos"
        description="Ranking desde ventas POS"
        isLoading={loadingTop}
        actions={<Badge variant="outline">{topProducts.length} productos</Badge>}
      >
        {topProducts.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">#</TableHead>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">SKU</TableHead>
                <TableHead scope="col" className="text-right">Unidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p, i) => (
                <TableRow key={`${p.sku}-${i}`}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{p.qty} uds.</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin datos de productos vendidos.
          </p>
        )}
      </DataTableShell>

      {overview?.lowStock?.length ? (
        <Card className="admin-card border-0">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-base font-semibold">Alertas de stock bajo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {overview.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
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
  );
}
