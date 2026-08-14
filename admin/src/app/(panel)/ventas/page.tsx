'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Product, Sale } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { EmitInvoiceDialog, issuedInvoice } from '@/components/admin/emit-invoice-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDocumentLookup } from '@/hooks/use-document-lookup';
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

type SaleLine = { product_id: string; quantity: string; unit_price: string; label: string };

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'other', label: 'Otro' },
];

export default function AdminVentasPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emitOpen, setEmitOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [voucherType, setVoucherType] = useState<'none' | 'boleta' | 'factura'>('boleta');
  const [documentNumber, setDocumentNumber] = useState('');
  const [legalName, setLegalName] = useState('');
  const { status: lookupStatus, message: lookupMessage } = useDocumentLookup(
    voucherType === 'factura' ? 'ruc' : 'dni',
    documentNumber,
    (data) => setLegalName(data.name),
  );
  const [lines, setLines] = useState<SaleLine[]>([
    { product_id: '', quantity: '1', unit_price: '', label: '' },
  ]);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['admin-sales'],
    queryFn: () => api<{ data: Sale[] }>('/sales'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products', { lite: true, limit: 200 }],
    queryFn: () => api<{ data: Product[] }>('/products?lite=true&limit=200'),
    staleTime: 2 * 60 * 1000,
  });

  const sales = salesData?.data ?? [];
  const products = productsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const items = lines
        .filter((l) => l.product_id && Number(l.quantity) > 0)
        .map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        }));

      if (!items.length) throw new Error('Agrega al menos un producto');

      return api<{ invoice_error?: string }>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          payment_method: paymentMethod,
          discount: Number(discount) || 0,
          tax: Number(tax) || 0,
          notes: notes.trim() || undefined,
          voucher_type: voucherType === 'none' ? undefined : voucherType,
          document_type: voucherType === 'factura' ? 'RUC' : voucherType === 'boleta' ? 'DNI' : undefined,
          document_number: documentNumber.trim() || undefined,
          legal_name: legalName.trim() || undefined,
          items,
        }),
      });
    },
    onSuccess: (result) => {
      toast.success(result.invoice_error ? 'Venta registrada (comprobante pendiente)' : 'Venta registrada');
      if (result.invoice_error) toast.warning(result.invoice_error);
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setDialogOpen(false);
      setLines([{ product_id: '', quantity: '1', unit_price: '', label: '' }]);
      setDiscount('0');
      setTax('0');
      setNotes('');
      setPaymentMethod('cash');
      setVoucherType('boleta');
      setDocumentNumber('');
      setLegalName('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              product_id: productId,
              unit_price: product ? String(product.sale_price) : '',
              label: product ? `${product.sku} — ${product.name}` : '',
            }
          : line,
      ),
    );
  }

  const estimatedTotal = lines.reduce((sum, l) => {
    if (!l.product_id) return sum;
    return sum + Number(l.unit_price || 0) * Number(l.quantity || 0);
  }, 0) - Number(discount || 0) + Number(tax || 0);

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Ventas POS" description="Punto de venta y comprobantes">
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Nueva venta
        </Button>
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
                  <TableCell>{sale.customer?.full_name ?? 'Mostrador'}</TableCell>
                  <TableCell className="capitalize">{sale.payment_method}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    S/ {Number(sale.total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {sale.status}
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
                        onClick={() => {
                          setSelectedSale(sale);
                          setEmitOpen(true);
                        }}
                      >
                        Emitir
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
            <DialogDescription>Registra una venta en el punto de venta.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="space-y-3">
              <Label>Productos</Label>
              {lines.map((line, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Select value={line.product_id} onValueChange={(v) => v && selectProduct(index, v)}>
                      <SelectTrigger aria-label={`Producto línea ${index + 1}`}>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label htmlFor={`qty-${index}`} className="sr-only">Cantidad</Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)),
                        )
                      }
                      aria-label="Cantidad"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label htmlFor={`price-${index}`} className="sr-only">Precio</Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === index ? { ...l, unit_price: e.target.value } : l)),
                        )
                      }
                      aria-label="Precio unitario"
                    />
                  </div>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Quitar línea"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((prev) => [...prev, { product_id: '', quantity: '1', unit_price: '', label: '' }])
                }
              >
                Agregar producto
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-payment">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? 'cash')}>
                  <SelectTrigger id="sale-payment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-discount">Descuento (S/)</Label>
                <Input id="sale-discount" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-tax">Impuesto (S/)</Label>
                <Input id="sale-tax" type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-notes">Notas</Label>
                <Input id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-3">
              <Label htmlFor="sale-voucher">Comprobante electrónico</Label>
              <Select
                value={voucherType}
                onValueChange={(v) => setVoucherType((v as typeof voucherType) ?? 'boleta')}
              >
                <SelectTrigger id="sale-voucher">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                  <SelectItem value="none">Sin comprobante</SelectItem>
                </SelectContent>
              </Select>
              {voucherType === 'factura' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sale-ruc">RUC</Label>
                    <Input
                      id="sale-ruc"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale-legal-name">Razón social</Label>
                    <Input
                      id="sale-legal-name"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Se completa al consultar SUNAT"
                      required
                    />
                  </div>
                </div>
              ) : voucherType === 'boleta' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sale-dni">DNI (opcional)</Label>
                    <Input
                      id="sale-dni"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      inputMode="numeric"
                      placeholder="Vacío = consumidor final"
                    />
                  </div>
                  {documentNumber.replace(/\D/g, '').length === 8 ? (
                    <div className="space-y-2">
                      <Label htmlFor="sale-dni-name">Nombre</Label>
                      <Input
                        id="sale-dni-name"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Se completa al consultar RENIEC"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {voucherType !== 'none' && lookupMessage ? (
                <p className={`text-xs ${lookupStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {lookupMessage}
                </p>
              ) : null}
            </div>

            <p className="text-right text-sm font-semibold">
              Total estimado: S/ {estimatedTotal.toFixed(2)}
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>Registrar venta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EmitInvoiceDialog
        open={emitOpen}
        onOpenChange={setEmitOpen}
        saleId={selectedSale?.id}
        defaultLegalName={selectedSale?.customer?.full_name ?? ''}
        defaultDocumentNumber={selectedSale?.customer?.document_number ?? ''}
      />
    </div>
  );
}
