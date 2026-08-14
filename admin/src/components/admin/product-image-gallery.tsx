'use client';

import type { ProductImage } from '@/types';
import { resolveProductImageUrl } from '@/lib/catalog/product-images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Trash2 } from 'lucide-react';

type GalleryImage = ProductImage & { storage_path?: string | null };

type ProductImageGalleryProps = {
  images: GalleryImage[];
  onSetPrimary?: (id: string) => void;
  onRemove?: (id: string) => void;
  showActions?: boolean;
};

export function ProductImageGallery({
  images,
  onSetPrimary,
  onRemove,
  showActions = false,
}: ProductImageGalleryProps) {
  if (!images.length) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((img) => {
        const src = resolveProductImageUrl(img);
        return (
          <div key={img.id} className="relative">
            <div className="size-20 overflow-hidden rounded-lg border bg-muted">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                  Sin vista previa
                </div>
              )}
            </div>
            {img.is_primary ? (
              <Badge className="absolute -top-2 -right-2 text-[10px]">Principal</Badge>
            ) : null}
            {showActions && !img.id.startsWith('pending') ? (
              <div className="mt-1 flex gap-1">
                {onSetPrimary ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onSetPrimary(img.id)}
                    aria-label="Marcar principal"
                  >
                    <Star className="size-3" />
                  </Button>
                ) : null}
                {onRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(img.id)}
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
