'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Package, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getPrimaryImageUrl } from '@/lib/catalog/product-images';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  isStorePickup,
  type OrderSummary,
} from '@/types/order';
import { cn } from '@/lib/utils';

interface OrderReceiptProps {
  order: OrderSummary;
  variant?: 'default' | 'compact';
  showActions?: boolean;
  confirmationHref?: string;
  className?: string;
}

export function OrderReceipt({
  order,
  variant = 'default',
  showActions = false,
  confirmationHref,
  className,
}: OrderReceiptProps) {
  const isCompact = variant === 'compact';
  const discount = Number(order.discount ?? 0);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('border-b bg-muted/30', isCompact && 'p-4')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className={cn('text-base', !isCompact && 'text-lg')}>
              Comprobante de compra
            </CardTitle>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{order.order_number}</p>
          </div>
          <Badge variant="secondary">
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4 text-sm', isCompact ? 'p-4' : 'p-6')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Fecha:</span>{' '}
            {new Date(order.created_at).toLocaleString('es-PE')}
          </div>
          {order.payment_method ? (
            <div>
              <span className="text-muted-foreground">Pago:</span>{' '}
              {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
            </div>
          ) : null}
          {order.shipping_address ? (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">
                {isStorePickup(order) ? 'Retiro:' : 'Envío:'}
              </span>{' '}
              {isStorePickup(order)
                ? `${order.shipping_city}${order.shipping_address ? ` — ${order.shipping_address}` : ''}`
                : `${order.shipping_address}${order.shipping_city ? `, ${order.shipping_city}` : ''}`}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="font-medium">Productos</p>
          <ul className="space-y-2">
            {order.items?.map((item, index) => {
              const image = getPrimaryImageUrl(item.product?.images);
              return (
                <li
                  key={item.id ?? `${item.product?.id ?? 'item'}-${index}`}
                  className="flex gap-3 rounded-lg border bg-card p-2.5"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.product?.name ?? 'Producto'}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="size-5 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug line-clamp-2">
                      {item.product?.name ?? 'Producto'}
                    </p>
                    {item.size || item.color ? (
                      <p className="text-xs text-muted-foreground">
                        {[item.size ? `Talla ${item.size}` : null, item.color].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × S/ {Number(item.unit_price ?? item.subtotal / item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">
                    S/ {Number(item.subtotal).toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-1.5 border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">S/ {Number(order.subtotal).toFixed(2)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Descuento</span>
              <span className="tabular-nums">- S/ {discount.toFixed(2)}</span>
            </div>
          ) : null}
          {order.shipping_cost != null ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {Number(order.shipping_cost) === 0 && isStorePickup(order)
                  ? 'Retiro'
                  : 'Envío'}
              </span>
              <span className="tabular-nums">
                {Number(order.shipping_cost) === 0
                  ? 'Gratis'
                  : `S/ ${Number(order.shipping_cost).toFixed(2)}`}
              </span>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">Precios con IGV incluido</p>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">S/ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {(() => {
          const invoice =
            order.invoice ??
            order.invoices?.find((item) => item.status === 'issued' && item.pdf_url) ??
            order.invoices?.[0];
          if (!invoice) return null;
          return (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm">
              <p className="font-medium">
                {invoice.document_kind === 'factura' ? 'Factura electrónica' : 'Boleta electrónica'}
                {invoice.serie && invoice.number ? ` ${invoice.serie}-${invoice.number}` : ''}
              </p>
              {invoice.pdf_url ? (
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-primary underline"
                >
                  Descargar PDF SUNAT
                </a>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  {invoice.sunat_description || 'Comprobante en proceso'}
                </p>
              )}
            </div>
          );
        })()}

        {showActions && confirmationHref ? (
          <div className="flex flex-wrap gap-2 border-t pt-4 print:hidden">
            <Link
              href={confirmationHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Ver comprobante completo
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              Imprimir
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
