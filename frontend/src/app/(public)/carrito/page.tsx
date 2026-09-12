'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '@/providers/cart-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { OrderTotalsSummary, useOrderTotals } from '@/components/public/order-totals-summary';
import { CartLineItem } from '@/components/public/cart-line-item';
import { cartLineKey } from '@/lib/catalog/variants';

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, total, clearCart, itemCount } = useCart();
  const { total: orderTotal } = useOrderTotals(total);

  if (!items.length) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ShoppingBag className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Tu carrito está vacío</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Explora nuestro catálogo y encuentra calzado, ropa y accesorios.
        </p>
        <Link href={PUBLIC_ROUTES.CATALOG} className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Tu selección</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Carrito de compras</h1>
          <p className="mt-1 text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'} · precios con IGV incluido
          </p>
        </div>
        <Link
          href={PUBLIC_ROUTES.CATALOG}
          className="text-sm font-medium text-primary hover:underline"
        >
          Seguir comprando
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-3">
          {items.map((item) => (
            <CartLineItem
              key={cartLineKey(item)}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-24">
          <Card className="overflow-hidden rounded-3xl border-0 shadow-lg ring-1 ring-border/60">
            <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 px-6 py-5">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="size-5 text-accent" />
                  Resumen del pedido
                </CardTitle>
              </CardHeader>
            </div>
            <CardContent className="space-y-5 p-6">
              <OrderTotalsSummary subtotal={total} />

              <Link
                href={PUBLIC_ROUTES.CHECKOUT}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'group w-full gap-2 text-base shadow-md',
                )}
              >
                Proceder al pago
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Button
                variant="ghost"
                onClick={clearCart}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Vaciar carrito
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Total estimado: <span className="font-semibold text-foreground">S/ {orderTotal.toFixed(2)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
