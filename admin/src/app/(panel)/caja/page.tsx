'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, ScanLine, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { useDocumentLookup } from '@/hooks/use-document-lookup';
import { ADMIN_ROUTES } from '@/constants/routes';
import { activeVariants, variantLabel } from '@/lib/catalog/variants';
import { calculatePosTotals } from '@/lib/pos/totals';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Invoice, Product, ProductVariant } from '@/types';
import { isOptionalPeruDni, restrictDigits } from '@/lib/validation/peru';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
] as const;

type PosLine = {
  key: string;
  product_id: string;
  variant_id: string;
  name: string;
  sku: string;
  detail: string;
  unit_price: number;
  quantity: number;
  stock: number;
};

function lineKey(productId: string, variantId = '') {
  return `${productId}:${variantId}`;
}

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

export default function AdminCajaPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pending, setPending] = useState<Product | null>(null);
  const [lines, setLines] = useState<PosLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['value']>('cash');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [voucherType, setVoucherType] = useState<'none' | 'boleta' | 'factura'>('boleta');
  const [documentNumber, setDocumentNumber] = useState('');
  const [legalName, setLegalName] = useState('');

  const { status: lookupStatus, message: lookupMessage } = useDocumentLookup(
    voucherType === 'factura' ? 'ruc' : 'dni',
    documentNumber,
    (data) => setLegalName(data.name),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!pending) scanRef.current?.focus();
  }, [lines.length, pending]);

  const { data: store } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const data = await api<{ tax_rate?: number; value?: { tax_rate?: number } }>('/settings/store');
      return { tax_rate: Number(data.tax_rate ?? data.value?.tax_rate ?? 18) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const taxRate = Number(store?.tax_rate ?? 18);

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['pos-search', debouncedSearch],
    queryFn: () =>
      api<{ data: Product[] }>(
        `/products?lite=true&active=true&limit=24&search=${encodeURIComponent(debouncedSearch)}`,
      ),
    enabled: debouncedSearch.length >= 2,
    staleTime: 30_000,
  });

  const results = searchData?.data ?? [];

  const subtotal = lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const totals = useMemo(
    () => calculatePosTotals(subtotal, taxRate, Number(discount) || 0),
    [discount, subtotal, taxRate],
  );

  function focusScan() {
    window.setTimeout(() => scanRef.current?.focus(), 0);
  }

  function addProduct(product: Product, variant?: ProductVariant) {
    if (product.is_active === false) {
      toast.error(`${product.name} no está activo`);
      return;
    }

    const variants = activeVariants(product);
    const matched = variant ?? product.matched_variant;

    if (!matched && variants.length > 1) {
      setPending(product);
      setSearch('');
      return;
    }

    const chosen = matched ?? variants[0];
    const stock = chosen ? chosen.stock_quantity : product.stock_quantity;
    if (stock <= 0) {
      toast.error(`Sin stock de ${product.name}`);
      return;
    }

    const key = lineKey(product.id, chosen?.id);
    setLines((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        if (existing.quantity >= existing.stock) {
          toast.error(`Solo hay ${existing.stock} de ${existing.name}`);
          return prev;
        }
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          variant_id: chosen?.id ?? '',
          name: product.name,
          sku: chosen?.sku || product.sku,
          detail: chosen ? variantLabel(chosen) : '',
          unit_price: Number(product.sale_price),
          quantity: 1,
          stock,
        },
      ];
    });
    setPending(null);
    setSearch('');
    focusScan();
  }

  async function submitScan(event?: FormEvent) {
    event?.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setScan('');
    try {
      const product = await api<Product>(`/products/lookup?code=${encodeURIComponent(code)}`);
      addProduct(product);
    } catch {
      try {
        const res = await api<{ data: Product[] }>(
          `/products?lite=true&active=true&limit=8&search=${encodeURIComponent(code)}`,
        );
        const matches = res.data ?? [];
        if (matches.length === 1) {
          addProduct(matches[0]);
          return;
        }
        if (matches.length > 1) {
          setSearch(code);
          toast.message('Hay varias coincidencias; elige el producto');
          return;
        }
        toast.error('Producto no encontrado');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Producto no encontrado');
      }
    }
    focusScan();
  }

  function changeQty(key: string, next: number) {
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.key !== key) return [line];
        if (next < 1) return [];
        if (next > line.stock) {
          toast.error(`Solo hay ${line.stock} disponible(s)`);
          return [{ ...line, quantity: line.stock }];
        }
        return [{ ...line, quantity: next }];
      }),
    );
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!lines.length) throw new Error('Agrega al menos un producto');
      if (voucherType === 'factura') {
        const ruc = documentNumber.replace(/\D/g, '');
        if (ruc.length !== 11) throw new Error('La factura necesita un RUC de 11 dígitos');
        if (!legalName.trim()) throw new Error('Completa la razón social');
      }
      if (voucherType === 'boleta' && !isOptionalPeruDni(documentNumber)) {
        throw new Error('El DNI debe tener 8 dígitos');
      }

      return api<{ invoice_error?: string; invoice?: Invoice }>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          payment_method: paymentMethod,
          discount: totals.discount,
          notes: notes.trim() || undefined,
          voucher_type: voucherType === 'none' ? undefined : voucherType,
          document_type:
            voucherType === 'factura' ? 'RUC' : voucherType === 'boleta' ? 'DNI' : undefined,
          document_number: documentNumber.trim() || undefined,
          legal_name: legalName.trim() || undefined,
          items: lines.map((line) => ({
            product_id: line.product_id,
            variant_id: line.variant_id || undefined,
            quantity: line.quantity,
            unit_price: line.unit_price,
          })),
        }),
      });
    },
    onSuccess: (result) => {
      toast.success(result.invoice_error ? 'Venta cobrada (comprobante pendiente)' : 'Venta cobrada');
      if (result.invoice_error) toast.warning(result.invoice_error);
      if (result.invoice?.pdf_url) {
        window.open(result.invoice.pdf_url, '_blank', 'noopener,noreferrer');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setLines([]);
      setPending(null);
      setDiscount('0');
      setNotes('');
      setDocumentNumber('');
      setLegalName('');
      setVoucherType('boleta');
      setPaymentMethod('cash');
      focusScan();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingVariants = pending ? activeVariants(pending) : [];

  return (
    <div className="-m-4 flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-muted/20 sm:-m-6 lg:-m-8">
      <header className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Caja</h1>
          <p className="text-xs text-muted-foreground">Escanea, elige talla y cobra. Precios con IGV.</p>
        </div>
        <form onSubmit={submitScan} className="relative min-w-[16rem] flex-1">
          <ScanLine
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={scanRef}
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder="Código de barras o SKU"
            className="h-11 pl-9 text-base"
            autoComplete="off"
            autoFocus
            aria-label="Escanear código de barras o SKU"
          />
        </form>
        <Link
          href={ADMIN_ROUTES.SALES}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Historial
        </Link>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-h-0 space-y-4 overflow-auto p-4 sm:p-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o código"
              className="h-10 pl-9"
              aria-label="Buscar producto"
            />
          </div>

          {pending ? (
            <div className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{pending.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pending.sku} · {money(Number(pending.sale_price))} · elige talla o color
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingVariants.map((variant) => {
                  const out = variant.stock_quantity <= 0;
                  return (
                    <Button
                      key={variant.id}
                      type="button"
                      variant={out ? 'outline' : 'secondary'}
                      disabled={out}
                      onClick={() => addProduct(pending, variant)}
                    >
                      {variantLabel(variant) || variant.sku || 'Variante'}
                      <span className={`ml-1 text-xs ${out ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {out ? 'agotado' : variant.stock_quantity}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {debouncedSearch.length >= 2 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {searching && !results.length ? (
                <p className="col-span-full text-sm text-muted-foreground">Buscando…</p>
              ) : null}
              {results.map((product) => {
                const variants = activeVariants(product);
                const stock = variants.length
                  ? variants.reduce((sum, item) => sum + item.stock_quantity, 0)
                  : product.stock_quantity;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="rounded-2xl border bg-background p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-semibold tabular-nums">{money(Number(product.sale_price))}</span>
                      <span className={stock <= 0 ? 'text-destructive' : 'text-muted-foreground'}>
                        {variants.length ? `${variants.length} tallas · ${stock}` : `Stock ${stock}`}
                      </span>
                    </div>
                  </button>
                );
              })}
              {!searching && !results.length ? (
                <p className="col-span-full text-sm text-muted-foreground">Sin coincidencias.</p>
              ) : null}
            </div>
          ) : !pending ? (
            <p className="rounded-2xl border border-dashed bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Escanea un código o busca el producto para armar el ticket.
            </p>
          ) : null}
        </section>

        <aside className="flex min-h-0 flex-col border-t bg-background lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Ticket</h2>
            {lines.length ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines([])}>
                Vaciar
              </Button>
            ) : null}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
            {lines.length ? (
              lines.map((line) => (
                <li key={line.key} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.detail ? `${line.detail} · ` : ''}
                        {line.sku} · {money(line.unit_price)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}
                      aria-label={`Quitar ${line.name}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => changeQty(line.key, line.quantity - 1)}
                        aria-label="Quitar uno"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => changeQty(line.key, line.quantity + 1)}
                        aria-label="Agregar uno"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {money(line.unit_price * line.quantity)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {line.stock - line.quantity} en stock tras esta venta
                  </p>
                </li>
              ))
            ) : (
              <li className="py-10 text-center text-sm text-muted-foreground">Ticket vacío</li>
            )}
          </ul>

          <form
            className="space-y-3 border-t p-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  type="button"
                  size="sm"
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod(method.value)}
                >
                  {method.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(['boleta', 'factura', 'none'] as const).map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  size="sm"
                  variant={voucherType === kind ? 'secondary' : 'outline'}
                  onClick={() => {
                    setVoucherType(kind);
                    setDocumentNumber('');
                    setLegalName('');
                  }}
                >
                  {kind === 'none' ? 'Sin CPE' : kind === 'boleta' ? 'Boleta' : 'Factura'}
                </Button>
              ))}
            </div>

            {voucherType === 'factura' ? (
              <div className="grid gap-2">
                <Label htmlFor="pos-ruc">RUC</Label>
                <Input
                  id="pos-ruc"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(restrictDigits(e.target.value, 11))}
                  inputMode="numeric"
                  maxLength={11}
                  required
                />
                <Label htmlFor="pos-razon">Razón social</Label>
                <Input
                  id="pos-razon"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                />
              </div>
            ) : voucherType === 'boleta' ? (
              <div className="grid gap-2">
                <Label htmlFor="pos-dni">DNI (opcional)</Label>
                <Input
                  id="pos-dni"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(restrictDigits(e.target.value, 8))}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Vacío = consumidor final"
                />
                {documentNumber.replace(/\D/g, '').length === 8 ? (
                  <>
                    <Label htmlFor="pos-nombre">Nombre</Label>
                    <Input
                      id="pos-nombre"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                  </>
                ) : null}
              </div>
            ) : null}

            {voucherType !== 'none' && lookupMessage ? (
              <p className={`text-xs ${lookupStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {lookupMessage}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="pos-discount">Descuento (S/)</Label>
                <Input
                  id="pos-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pos-notes">Nota</Label>
                <Input id="pos-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Descuento</dt>
                  <dd className="tabular-nums">-{money(totals.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-muted-foreground">
                <dt>IGV incluido ({taxRate}%)</dt>
                <dd className="tabular-nums">{money(totals.tax)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
            </dl>

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={!lines.length || createMutation.isPending}
            >
              {createMutation.isPending ? 'Cobrando…' : `Cobrar ${money(totals.total)}`}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
