'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Invoice } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import {
  EmitInvoiceDialog,
  needsInvoiceIdentityForm,
} from '@/components/admin/emit-invoice-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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

const statusLabels: Record<Invoice['status'], string> = {
  pending: 'Pendiente',
  issued: 'Emitido',
  rejected: 'Rechazado',
  error: 'Error',
};

const statusVariant: Record<Invoice['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  issued: 'default',
  rejected: 'destructive',
  error: 'destructive',
};

function canRetry(invoice: Invoice) {
  return (
    (invoice.status === 'error' || invoice.status === 'pending' || invoice.status === 'rejected') &&
    Boolean(invoice.order_id || invoice.sale_id)
  );
}

export default function AdminComprobantesPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [retrying, setRetrying] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api<Invoice[]>('/billing'),
  });

  const retryMutation = useMutation({
    mutationFn: (invoice: Invoice) =>
      api<Invoice>('/billing/emit', {
        method: 'POST',
        body: JSON.stringify({
          kind: invoice.document_kind,
          order_id: invoice.order_id || undefined,
          sale_id: invoice.sale_id || undefined,
          document_type: invoice.client_document_type || undefined,
          document_number: invoice.client_document_number || undefined,
          legal_name: invoice.client_name || undefined,
        }),
      }),
    onSuccess: (invoice) => {
      toast.success(
        invoice.status === 'issued' ? 'Comprobante reemitido' : 'Comprobante actualizado',
      );
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      if (invoice.pdf_url) {
        window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleRetry(invoice: Invoice) {
    if (
      invoice.document_kind === 'factura' &&
      needsInvoiceIdentityForm(
        'factura',
        invoice.client_document_number ?? '',
        invoice.client_name ?? '',
      )
    ) {
      setRetrying(invoice);
      return;
    }
    retryMutation.mutate(invoice);
  }

  const filtered = invoices.filter((invoice) =>
    kindFilter === 'all' ? true : invoice.document_kind === kindFilter,
  );

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader
        title="Comprobantes"
        description="Boletas y facturas electrónicas emitidas con Nubefact"
      />

      <div className="max-w-xs space-y-2">
        <Label htmlFor="invoice-kind">Tipo</Label>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v ?? 'all')}>
          <SelectTrigger id="invoice-kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="boleta">Boletas</SelectItem>
            <SelectItem value="factura">Facturas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTableShell
        title="Listado de comprobantes"
        isLoading={isLoading}
        actions={<Badge variant="outline">{filtered.length} comprobantes</Badge>}
      >
        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : 'No se pudieron cargar los comprobantes. Aplica la migración SQL en Supabase.'}
          </p>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Número</TableHead>
                  <TableHead scope="col">Cliente</TableHead>
                  <TableHead scope="col">Origen</TableHead>
                  <TableHead scope="col" className="text-right">Total</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col" className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="capitalize">{invoice.document_kind}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {invoice.serie && invoice.number
                        ? `${invoice.serie}-${invoice.number}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div>{invoice.client_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.client_document_number || ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.order?.order_number
                        ? `Pedido ${invoice.order.order_number}`
                        : invoice.sale?.sale_number
                          ? `Venta ${invoice.sale.sale_number}`
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      S/ {Number(invoice.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status] ?? 'outline'}>
                        {statusLabels[invoice.status] ?? invoice.status}
                      </Badge>
                      {invoice.error_message || invoice.sunat_description ? (
                        <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
                          {invoice.error_message || invoice.sunat_description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canRetry(invoice) ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="gap-1"
                            disabled={retryMutation.isPending && retryMutation.variables?.id === invoice.id}
                            onClick={() => handleRetry(invoice)}
                          >
                            <RotateCcw className="size-3.5" />
                            Reemitir
                          </Button>
                        ) : null}
                        {invoice.pdf_url ? (
                          <a
                            href={invoice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                            aria-label="Abrir PDF"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : (
                          <FileText className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay comprobantes emitidos.
          </p>
        )}
      </DataTableShell>

      <EmitInvoiceDialog
        open={Boolean(retrying)}
        onOpenChange={(open) => {
          if (!open) setRetrying(null);
        }}
        title="Reemitir comprobante"
        lockKind
        orderId={retrying?.order_id ?? undefined}
        saleId={retrying?.sale_id ?? undefined}
        defaultKind={retrying?.document_kind ?? 'boleta'}
        defaultDocumentNumber={retrying?.client_document_number ?? ''}
        defaultLegalName={
          retrying?.client_name && retrying.client_name !== 'CLIENTES VARIOS'
            ? retrying.client_name
            : ''
        }
      />
    </div>
  );
}
