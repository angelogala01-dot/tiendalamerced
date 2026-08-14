'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/types';
import { cn } from '@/lib/utils';

interface CartLineItemProps {
  item: CartItem;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemove?: (productId: string) => void;
  variant?: 'editable' | 'readonly';
  className?: string;
}

export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
  variant = 'editable',
  className,
}: CartLineItemProps) {
  const lineTotal = item.price * item.quantity;
  const editable = variant === 'editable' && onUpdateQuantity && onRemove;

  return (
    <div
      className={cn(
        'flex gap-4 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-4',
        className,
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-8 opacity-40" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium leading-snug line-clamp-2">{item.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            S/ {item.price.toFixed(2)} c/u
            <span className="mx-1.5 text-border">·</span>
            <span className="text-xs">IGV incluido</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {editable ? (
            <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                aria-label="Disminuir cantidad"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {item.quantity}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                aria-label="Aumentar cantidad"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium tabular-nums">
              × {item.quantity}
            </span>
          )}

          <p className="min-w-[5.5rem] text-right text-base font-semibold tabular-nums sm:text-lg">
            S/ {lineTotal.toFixed(2)}
          </p>

          {editable ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.productId)}
              aria-label="Eliminar producto"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
