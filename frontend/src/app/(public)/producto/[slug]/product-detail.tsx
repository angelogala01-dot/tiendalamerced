'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPrimaryImageUrl, resolveProductImageUrl } from '@/lib/catalog/product-images';
import { getBrandLabel, getCategoryLabel } from '@/lib/catalog/normalize';
import {
  activeVariants,
  productHasVariants,
  uniqueOptionValues,
} from '@/lib/catalog/variants';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

export function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const variants = useMemo(() => activeVariants(product), [product]);
  const hasVariants = productHasVariants(product);
  const sizes = uniqueOptionValues(variants, 'size');
  const colors = uniqueOptionValues(variants, 'color');
  const [selectedSize, setSelectedSize] = useState<string>(sizes.length === 1 ? sizes[0] : '');
  const [selectedColor, setSelectedColor] = useState<string>(colors.length === 1 ? colors[0] : '');

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      variants.find((variant) => {
        const sizeOk = !sizes.length || variant.size === selectedSize;
        const colorOk = !colors.length || variant.color === selectedColor;
        return sizeOk && colorOk;
      }) ?? null
    );
  }, [colors.length, hasVariants, selectedColor, selectedSize, sizes.length, variants]);

  const stock = hasVariants ? (selectedVariant?.stock_quantity ?? 0) : product.stock_quantity;
  const inStock = stock > 0;
  const canAdd = !hasVariants || Boolean(selectedVariant);
  const primaryImage = getPrimaryImageUrl(product.images);
  const gallery = product.images ?? [];
  const brandName = getBrandLabel(product.brand);
  const categoryName = getCategoryLabel(product.category);

  function handleAdd() {
    if (hasVariants && !selectedVariant) {
      toast.error('Elige talla y color para agregar');
      return;
    }
    if (!inStock) return;
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        size: selectedVariant?.size ?? undefined,
        color: selectedVariant?.color ?? undefined,
        name: product.name,
        price: Number(product.sale_price),
        image: primaryImage,
        maxQuantity: stock,
      },
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 md:py-16">
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

          {sizes.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Talla</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const available = variants.some(
                    (variant) =>
                      variant.size === size &&
                      (!selectedColor || !colors.length || variant.color === selectedColor) &&
                      variant.stock_quantity > 0,
                  );
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!available}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'min-w-11 rounded-full border px-3 py-2 text-sm font-medium transition',
                        selectedSize === size
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground/40',
                        !available && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {colors.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const available = variants.some(
                    (variant) =>
                      variant.color === color &&
                      (!selectedSize || !sizes.length || variant.size === selectedSize) &&
                      variant.stock_quantity > 0,
                  );
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={!available}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition',
                        selectedColor === color
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground/40',
                        !available && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-muted px-3 py-1">SKU: {selectedVariant?.sku || product.sku}</span>
            <span className={inStock && canAdd ? 'text-emerald-700' : 'text-destructive'}>
              {hasVariants && !selectedVariant
                ? 'Elige talla y color'
                : inStock
                  ? `${stock} disponibles`
                  : 'Agotado'}
            </span>
          </div>
          <Button
            size="lg"
            className="h-12 rounded-full px-8"
            disabled={!inStock || !canAdd}
            onClick={handleAdd}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
