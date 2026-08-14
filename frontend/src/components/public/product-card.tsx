'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { useCart } from '@/providers/cart-provider';
import { useFavorites } from '@/providers/favorites-provider';
import { getPrimaryImageUrl } from '@/lib/catalog/product-images';
import { getBrandLabel, getCategoryLabel } from '@/lib/catalog/normalize';
import { TiltCard } from '@/components/public/tilt-card';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'boutique';
}

export function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggle, isFavorite } = useFavorites();
  const slug = product.slug ?? product.id;
  const image = getPrimaryImageUrl(product.images);
  const brandName = getBrandLabel(product.brand);
  const categoryName = getCategoryLabel(product.category);
  const inStock = product.stock_quantity > 0;
  const isBoutique = variant === 'boutique';

  const handleAdd = () =>
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.sale_price),
      image,
    });

  return (
    <TiltCard>
      <article
        className={cn(
          'group shine-sweep overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 transition-shadow duration-300 hover:shadow-[0_24px_50px_-24px_oklch(0.2_0.02_40/0.35)]',
          isBoutique && 'bg-transparent ring-0 hover:shadow-none',
        )}
      >
        <div className="relative">
          <Link href={PUBLIC_ROUTES.PRODUCT(slug)} className="block">
            <div
              className={cn(
                'relative overflow-hidden bg-muted',
                isBoutique ? 'aspect-[3/4] rounded-2xl' : 'aspect-square',
              )}
            >
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin imagen
                </div>
              )}
              {!inStock && (
                <Badge className="absolute left-3 top-3 bg-foreground text-background">Agotado</Badge>
              )}
              {isBoutique && inStock && (
                <Badge className="absolute left-3 top-3 border-0 bg-accent text-accent-foreground">
                  Nuevo
                </Badge>
              )}
            </div>
          </Link>

          <div className="absolute inset-x-3 bottom-3 flex translate-y-3 gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
            <Button
              size="sm"
              className="flex-1 rounded-full bg-foreground/90 text-background backdrop-blur hover:bg-foreground"
              disabled={!inStock}
              onClick={handleAdd}
            >
              <ShoppingCart className="mr-1 h-4 w-4" />
              Agregar
            </Button>
            <Link
              href={PUBLIC_ROUTES.PRODUCT(slug)}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:bg-white"
              aria-label="Ver producto"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Button
              size="sm"
              variant="secondary"
              className="size-8 rounded-full bg-white/95 p-0"
              onClick={() => toggle(product.id)}
              aria-label="Favoritos"
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  isFavorite(product.id) && 'fill-accent text-accent',
                )}
              />
            </Button>
          </div>
        </div>

        <div className={cn('space-y-1', isBoutique ? 'pt-4' : 'p-4')}>
          {categoryName ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {categoryName}
            </p>
          ) : null}
          {brandName ? <p className="text-xs text-muted-foreground">{brandName}</p> : null}
          <Link href={PUBLIC_ROUTES.PRODUCT(slug)}>
            <h3
              className={cn(
                'font-medium transition-colors hover:text-accent',
                isBoutique
                  ? 'font-[family-name:var(--font-heading)] text-lg'
                  : 'line-clamp-2',
              )}
            >
              {product.name}
            </h3>
          </Link>
          <p className={cn('font-semibold tabular-nums', isBoutique ? 'text-base' : 'text-lg')}>
            S/ {Number(product.sale_price).toFixed(2)}
          </p>
        </div>
      </article>
    </TiltCard>
  );
}
