'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Invoice, Sale } from '@/types';
import { ADMIN_ROUTES } from '@/constants/routes';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import {
  EmitInvoiceDialog,
  issuedInvoice,
  needsInvoiceIdentityForm,
  saleCustomerLabel,
  voucherFromSale,
} from '@/components/admin/emit-invoice-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'other', label: 'Otro' },
];

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
  pending: 'Pendiente',
};

export default function AdminVentasPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [emitOpen, setEmitOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['admin-sales'],
    queryFn: () => api<{ data: Sale[] }>('/sales'),
  });

  const sales = salesData?.data ?? [];

  const emitMutation = useMutation({
    mutationFn: (sale: Sale) => {
      const voucher = voucherFromSale(sale);
      return api<Invoice>('/billing/emit', {
        method: 'POST',
        body: JSON.stringify({
          sale_id: sale.id,
          kind: voucher.kind,
          document_type: voucher.kind === 'factura' ? 'RUC' : 'DNI',
          document_number: voucher.documentNumber.trim() || undefined,
          legal_name: voucher.legalName.trim() || undefined,
        }),
      });
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      if (invoice.pdf_url) {
        toast.success(`${invoice.document_kind === 'factura' ? 'Factura' : 'Boleta'} emitida`);
        window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
        return;
      }
      toast.warning(invoice.error_message || 'El comprobante quedó pendiente');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedVoucher = voucherFromSale(selectedSale);

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Ventas" description="Historial de mostrador y comprobantes">
        <Link href={ADMIN_ROUTES.POS} className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}>
          <ScanLine className="size-4" aria-hidden />
          Abrir caja
        </Link>
      </PageHeader>

      <DataTableShell
        title="Historial de ventas"
        isLoading={isLoading}
        actions={<Badge variant="outline">{sales.length} ventas</Badge>}
      >
        {sales.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Nº venta</TableHead>
                <TableHead scope="col">Fecha</TableHead>
                <TableHead scope="col">Cliente</TableHead>
                <TableHead scope="col">Pago</TableHead>
                <TableHead scope="col" className="text-right">Total</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs">{sale.sale_number}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>{saleCustomerLabel(sale)}</TableCell>
                  <TableCell>
                    {PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label ?? sale.payment_method}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    S/ {Number(sale.total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[sale.status] ?? sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {issuedInvoice(sale.invoices)?.pdf_url ? (
                      <a
                        href={issuedInvoice(sale.invoices)!.pdf_url!}
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
                        size="sm"
                        disabled={emitMutation.isPending && emitMutation.variables?.id === sale.id}
                        onClick={() => {
                          const voucher = voucherFromSale(sale);
                          if (needsInvoiceIdentityForm(voucher.kind, voucher.documentNumber, voucher.legalName)) {
                            setSelectedSale(sale);
                            setEmitOpen(true);
                            return;
                          }
                          emitMutation.mutate(sale);
                        }}
                      >
                        {emitMutation.isPending && emitMutation.variables?.id === sale.id
                          ? 'Emitiendo…'
                          : 'Emitir'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin ventas registradas.</p>
        )}
      </DataTableShell>

      <EmitInvoiceDialog
        open={emitOpen}
        onOpenChange={setEmitOpen}
        saleId={selectedSale?.id}
        defaultKind={selectedVoucher.kind}
        defaultLegalName={selectedVoucher.legalName}
        defaultDocumentNumber={selectedVoucher.documentNumber}
        lockKind
      />
    </div>
  );
}
