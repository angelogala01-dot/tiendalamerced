'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Order } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmitInvoiceDialog, issuedInvoice } from '@/components/admin/emit-invoice-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
] as const;

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  confirmed: 'secondary',
  processing: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
};

export default function AdminPedidosPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [emitOpen, setEmitOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api<{ data: Order[] | null }>(`/orders${q}`);
      return res.data ?? [];
    },
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-order', selected?.id],
    queryFn: () => api<Order>(`/orders/${selected!.id}`),
    enabled: !!selected?.id && detailOpen,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled', notes: 'Cancelado por administrador' }),
      }),
    onSuccess: () => {
      toast.success('Pedido cancelado');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setCancelOpen(false);
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const detail = orderDetail ?? selected;

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Pedidos" description="Gestión y seguimiento de pedidos online" />

      <div className="max-w-xs space-y-2">
        <Label htmlFor="order-filter">Filtrar por estado</Label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger id="order-filter" className="w-full">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTableShell
        title="Listado de pedidos"
        isLoading={isLoading}
        actions={<Badge variant="outline">{orders.length} pedidos</Badge>}
      >
        {orders.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Nº pedido</TableHead>
                  <TableHead scope="col">Cliente</TableHead>
                  <TableHead scope="col">Fecha</TableHead>
                  <TableHead scope="col" className="text-right">Total</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col" className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                    <TableCell>{order.customer?.full_name ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      S/ {Number(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(status) => status && statusMutation.mutate({ id: order.id, status })}
                        disabled={statusMutation.isPending || order.status === 'cancelled'}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue>
                            <Badge variant={statusVariant[order.status] ?? 'outline'}>
                              {statusLabels[order.status] ?? order.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Ver pedido ${order.order_number}`}
                          onClick={() => { setSelected(order); setDetailOpen(true); }}>
                          <Eye className="size-4" />
                        </Button>
                        {issuedInvoice(order.invoices)?.pdf_url ? (
                          <a
                            href={issuedInvoice(order.invoices)!.pdf_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                            aria-label="Ver PDF"
                          >
                            <FileText className="size-4" />
                          </a>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Emitir comprobante"
                            onClick={() => { setSelected(order); setEmitOpen(true); }}
                          >
                            <FileText className="size-4" />
                          </Button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                          <Button variant="ghost" size="sm" className="text-destructive"
                            onClick={() => { setSelected(order); setCancelOpen(true); }}>
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin pedidos encontrados.</p>
        )}
      </DataTableShell>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido {detail?.order_number}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Cargando detalle…</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Cliente:</span> {detail.customer?.full_name}</div>
                <div><span className="text-muted-foreground">Estado:</span> {statusLabels[detail.status]}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {new Date(detail.created_at).toLocaleString('es-PE')}</div>
                <div><span className="text-muted-foreground">Pago:</span> {detail.payment_method ?? '—'}</div>
              </div>
              {detail.shipping_address ? (
                <div>
                  <span className="text-muted-foreground">Envío:</span>{' '}
                  {detail.shipping_address}, {detail.shipping_city}
                </div>
              ) : null}
              <div>
                <p className="font-medium mb-2">Ítems</p>
                <ul className="space-y-1">
                  {detail.items?.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.product?.name ?? 'Producto'} × {item.quantity}</span>
                      <span className="tabular-nums">S/ {Number(item.subtotal).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>S/ {Number(detail.subtotal).toFixed(2)}</span></div>
                {detail.tax != null ? (
                  <div className="flex justify-between"><span>IGV</span><span>S/ {Number(detail.tax).toFixed(2)}</span></div>
                ) : null}
                {detail.shipping_cost != null ? (
                  <div className="flex justify-between"><span>Envío</span><span>S/ {Number(detail.shipping_cost).toFixed(2)}</span></div>
                ) : null}
                <div className="flex justify-between font-bold"><span>Total</span><span>S/ {Number(detail.total).toFixed(2)}</span></div>
              </div>
              {(() => {
                const invoice = issuedInvoice(detail.invoices);
                if (!invoice) {
                  return (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEmitOpen(true); }}
                    >
                      Emitir boleta o factura
                    </Button>
                  );
                }
                return (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="font-medium">
                      {invoice.document_kind === 'factura' ? 'Factura' : 'Boleta'}
                      {invoice.serie && invoice.number ? ` ${invoice.serie}-${invoice.number}` : ''}
                    </p>
                    {invoice.pdf_url ? (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm text-primary underline"
                      >
                        Descargar PDF
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {invoice.sunat_description || invoice.error_message || invoice.status}
                      </p>
                    )}
                  </div>
                );
              })()}
              {detail.history?.length ? (
                <div>
                  <p className="font-medium mb-2">Historial</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {detail.history.map((h) => (
                      <li key={h.id}>
                        {statusLabels[h.status] ?? h.status} — {new Date(h.created_at).toLocaleString('es-PE')}
                        {h.notes ? ` (${h.notes})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <EmitInvoiceDialog
        open={emitOpen}
        onOpenChange={setEmitOpen}
        orderId={selected?.id}
        defaultLegalName={selected?.customer?.full_name ?? ''}
        defaultDocumentNumber={selected?.customer?.document_number ?? ''}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pedido"
        description={`¿Cancelar el pedido "${selected?.order_number}"?`}
        confirmLabel="Cancelar pedido"
        variant="destructive"
        loading={cancelMutation.isPending}
        onConfirm={() => { if (selected) cancelMutation.mutate(selected.id); }}
      />
    </div>
  );
}
