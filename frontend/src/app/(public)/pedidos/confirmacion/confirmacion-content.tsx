'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react';
import { ordersService } from '@/services/catalog.service';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { OrderReceipt } from '@/components/public/order-receipt';
import { PUBLIC_ROUTES } from '@/constants/routes';
import type { OrderInvoice, OrderSummary } from '@/types/order';
import { cn } from '@/lib/utils';

function pickInvoice(order: OrderSummary): OrderInvoice | null {
  return (
    order.invoice ??
    order.invoices?.find((item) => item.status === 'issued' && item.pdf_url) ??
    order.invoices?.[0] ??
    null
  );
}

export function ConfirmacionContent() {
  const { user } = useAuth();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [emitError, setEmitError] = useState('');

  useEffect(() => {
    setOrderNumber(new URLSearchParams(window.location.search).get('numero') ?? '');
  }, []);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-confirmation', orderNumber],
    queryFn: () => ordersService.track(orderNumber),
    enabled: orderNumber.length >= 5,
  });

  const invoice = order ? pickInvoice(order) : null;

  const emitMutation = useMutation({
    mutationFn: () =>
      api<OrderInvoice>(`/orders/${order!.id}/comprobante`, {
        method: 'POST',
        body: JSON.stringify({ kind: 'boleta' }),
      }),
    onSuccess: () => {
      setEmitError('');
      void queryClient.invalidateQueries({ queryKey: ['order-confirmation', orderNumber] });
    },
    onError: (err: Error) => setEmitError(err.message),
  });

  useEffect(() => {
    if (!order || !user || invoice?.pdf_url || emitMutation.isPending || emitMutation.isSuccess) {
      return;
    }
    emitMutation.mutate();
    // Emit once per confirmation load when Nubefact PDF is missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, user?.id, invoice?.pdf_url]);

  if (!orderNumber) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">No se encontró el número de pedido.</p>
        <Link href={PUBLIC_ROUTES.HOME} className={cn(buttonVariants(), 'mt-4 inline-flex')}>
          Ir al inicio
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Cargando comprobante…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">No se pudo cargar el comprobante.</p>
        <Link href={PUBLIC_ROUTES.ORDER_TRACK} className={cn(buttonVariants({ variant: 'outline' }))}>
          Rastrear pedido
        </Link>
      </div>
    );
  }

  const voucherTitle =
    invoice?.document_kind === 'factura' ? 'Factura electrónica' : 'Boleta electrónica';
  const voucherNumber =
    invoice?.serie && invoice?.number ? `${invoice.serie}-${invoice.number}` : '';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 print:py-4">
      <div className="mb-8 text-center print:mb-4">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" aria-hidden />
        <h1 className="text-3xl font-bold">¡Compra exitosa!</h1>
        <p className="mt-2 text-muted-foreground">
          {invoice?.pdf_url
            ? 'Tu comprobante electrónico de Nubefact ya está listo.'
            : 'Tu pedido fue registrado. Estamos generando la boleta en Nubefact.'}
        </p>
      </div>

      {invoice?.pdf_url ? (
        <section className="mb-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <FileText className="size-4" />
                {voucherTitle}
                {voucherNumber ? ` ${voucherNumber}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">Documento oficial SUNAT vía Nubefact</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
              >
                <ExternalLink className="size-4" />
                Ver PDF
              </a>
            </div>
          </div>
          <div className="space-y-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nubefact no permite mostrar el PDF dentro de esta página. Ábrelo en una pestaña
              nueva para verlo, descargarlo o imprimirlo.
            </p>
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'lg' }), 'inline-flex gap-2')}
            >
              <FileText className="size-5" />
              Abrir boleta Nubefact
            </a>
            {voucherNumber ? (
              <p className="font-mono text-sm text-muted-foreground">{voucherNumber}</p>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">
            {emitMutation.isPending
              ? 'Emitiendo boleta electrónica en Nubefact…'
              : emitError || 'Aún no hay PDF de Nubefact para este pedido.'}
          </p>
          {!emitMutation.isPending ? (
            <Button
              className="mt-3"
              size="sm"
              type="button"
              onClick={() => emitMutation.mutate()}
              disabled={!user || emitMutation.isPending}
            >
              Emitir boleta Nubefact
            </Button>
          ) : null}
        </div>
      )}

      <OrderReceipt order={order} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center print:hidden">
        <Link href={PUBLIC_ROUTES.ORDERS} className={cn(buttonVariants())}>
          Ver mis pedidos
        </Link>
        <Link href={PUBLIC_ROUTES.CATALOG} className={cn(buttonVariants({ variant: 'outline' }))}>
          Seguir comprando
        </Link>
        {invoice?.pdf_url ? (
          <Button variant="secondary" onClick={() => window.open(invoice.pdf_url!, '_blank')}>
            Imprimir boleta
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => window.print()}>
            Imprimir resumen
          </Button>
        )}
      </div>
    </div>
  );
}
