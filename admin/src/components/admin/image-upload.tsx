'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ImageUploadProps = {
  currentUrl?: string | null;
  onFileSelected: (file: File) => Promise<void>;
  onRemove?: () => void;
  disabled?: boolean;
  label?: string;
};

export function ImageUpload({
  currentUrl,
  onFileSelected,
  onRemove,
  disabled,
  label = 'Imagen',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no permitido. Use JPG, PNG o WEBP.');
      return;
    }
    setUploading(true);
    try {
      await onFileSelected(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {currentUrl ? (
          <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              'flex size-24 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/50',
              disabled && 'opacity-50',
            )}
          >
            <ImagePlus className="size-8 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Subiendo…
              </>
            ) : (
              currentUrl ? 'Cambiar imagen' : 'Subir imagen'
            )}
          </Button>
          {currentUrl && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={disabled || uploading}
              onClick={() => void onRemove()}
            >
              <Trash2 className="size-4" aria-hidden />
              Quitar
            </Button>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-xs text-muted-foreground">JPG, PNG o WEBP.</p>
        </div>
      </div>
    </div>
  );
}
