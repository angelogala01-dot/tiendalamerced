'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CLOTHING_SIZES,
  SHOE_SIZES,
  emptyDraft,
  type VariantDraft,
} from '@/lib/catalog/variants';

type ProductVariantsEditorProps = {
  drafts: VariantDraft[];
  onChange: (drafts: VariantDraft[]) => void;
};

export function ProductVariantsEditor({ drafts, onChange }: ProductVariantsEditorProps) {
  function update(key: string, patch: Partial<VariantDraft>) {
    onChange(drafts.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addSizes(sizes: string[]) {
    const existing = new Set(drafts.map((row) => `${row.size}|${row.color}`));
    const next = [...drafts];
    for (const size of sizes) {
      const combo = `${size}|`;
      if (existing.has(combo)) continue;
      next.push({ ...emptyDraft(), size });
    }
    onChange(next.length ? next : [emptyDraft()]);
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Tallas y colores</Label>
          <p className="text-xs text-muted-foreground">
            Si agregas variantes, el stock se controla por talla/color. El código de barras de cada talla es el que lee Caja.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="xs" onClick={() => addSizes(SHOE_SIZES)}>
            Calzado 35–44
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => addSizes(CLOTHING_SIZES)}>
            Ropa XS–XXL
          </Button>
        </div>
      </div>

      {drafts.map((row) => (
        <div key={row.key} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_7rem_5rem_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Talla</Label>
            <Input
              value={row.size}
              onChange={(e) => update(row.key, { size: e.target.value })}
              placeholder="38"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <Input
              value={row.color}
              onChange={(e) => update(row.key, { color: e.target.value })}
              placeholder="Negro"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Código</Label>
            <Input
              value={row.barcode}
              onChange={(e) => update(row.key, { barcode: e.target.value })}
              placeholder="EAN"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stock</Label>
            <Input
              type="number"
              min="0"
              value={row.stock_quantity}
              onChange={(e) => update(row.key, { stock_quantity: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(drafts.filter((item) => item.key !== row.key))}
          >
            Quitar
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onChange([...drafts, emptyDraft()])}
      >
        <Plus className="size-3.5" />
        Agregar talla/color
      </Button>
    </div>
  );
}
