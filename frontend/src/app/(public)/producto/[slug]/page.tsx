'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { productsService } from '@/services/catalog.service';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';
import { getPrimaryImageUrl, resolveProductImageUrl } from '@/lib/catalog/product-images';
import { getBrandLabel, getCategoryLabel } from '@/lib/catalog/normalize';

export default function ProductoPage() {
  const pathname = usePathname();
  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsService.getById(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-96 w-full max-w-lg rounded-3xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Producto no encontrado</p>
      </div>
    );
  }

  const inStock = product.stock_quantity > 0;
  const primaryImage = getPrimaryImageUrl(product.images);
  const gallery = product.images ?? [];
  const brandName = getBrandLabel(product.brand);
  const categoryName = getCategoryLabel(product.category);

  return (
    <div className="page-enter container mx-auto px-4 py-10 md:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted shadow-[0_32px_70px_-28px_oklch(0.2_0.02_40/0.4)]">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((img) => {
                const src = resolveProductImageUrl(img);
                if (!src) return null;
                return (
                  <div
                    key={img.id}
                    className="relative size-16 shrink-0 overflow-hidden rounded-xl border"
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-6 lg:sticky lg:top-28">
          <div className="flex flex-wrap gap-2">
            {categoryName ? <Badge variant="secondary">{categoryName}</Badge> : null}
            {brandName ? <Badge variant="outline">{brandName}</Badge> : null}
          </div>
          <h1 className="text-4xl font-semibold md:text-5xl">{product.name}</h1>
          <p className="text-3xl font-semibold tabular-nums text-accent">
            S/ {Number(product.sale_price).toFixed(2)}
          </p>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            {product.description ?? 'Sin descripción'}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-muted px-3 py-1">SKU: {product.sku}</span>
            <span className={inStock ? 'text-emerald-700' : 'text-destructive'}>
              {inStock ? `${product.stock_quantity} disponibles` : 'Agotado'}
            </span>
          </div>
          <Button
            size="lg"
            className="h-12 rounded-full px-8"
            disabled={!inStock}
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price: Number(product.sale_price),
                image: primaryImage,
              })
            }
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
