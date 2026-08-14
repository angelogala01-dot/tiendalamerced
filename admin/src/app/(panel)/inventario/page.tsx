'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { InventoryMovement, Product } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const movementLabels: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  adjustment: 'Ajuste',
};

export default function AdminInventarioPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState<'entry' | 'exit' | 'adjustment'>('entry');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['admin-inventory-movements'],
    queryFn: () => api<InventoryMovement[]>('/inventory/movements'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products', { lite: true, limit: 200 }],
    queryFn: () => api<{ data: Product[] }>('/products?lite=true&limit=200'),
    staleTime: 2 * 60 * 1000,
  });

  const products = productsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          movement_type: movementType,
          quantity: Number(quantity),
          notes: notes.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('Movimiento registrado');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDialogOpen(false);
      setProductId('');
      setQuantity('1');
      setNotes('');
      setMovementType('entry');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Inventario" description="Movimientos de almacén y kardex">
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Registrar movimiento
        </Button>
      </PageHeader>

      <DataTableShell
        title="Historial de movimientos"
        description="Últimos 100 movimientos registrados"
        isLoading={isLoading}
        actions={<Badge variant="outline">{movements.length} movimientos</Badge>}
      >
        {movements.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Fecha</TableHead>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col" className="text-right">Cantidad</TableHead>
                <TableHead scope="col" className="text-right">Stock</TableHead>
                <TableHead scope="col">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.product?.name ?? '—'}</p>
                      <p className="font-mono text-xs text-muted-foreground">{m.product?.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{movementLabels[m.movement_type] ?? m.movement_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {m.stock_before} → {m.stock_after}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {m.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos registrados.</p>
        )}
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
            <DialogDescription>Entrada, salida o ajuste de stock.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!productId) { toast.error('Selecciona un producto'); return; }
              if (Number(quantity) <= 0) { toast.error('La cantidad debe ser mayor a 0'); return; }
              createMutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="inv-product">Producto</Label>
              <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
                <SelectTrigger id="inv-product" className="w-full" aria-label="Producto">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} — {p.name} (stock: {p.stock_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-type">Tipo de movimiento</Label>
              <Select value={movementType} onValueChange={(v) => v && setMovementType(v as typeof movementType)}>
                <SelectTrigger id="inv-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Salida</SelectItem>
                  <SelectItem value="adjustment">Ajuste (stock final)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-qty">Cantidad</Label>
              <Input
                id="inv-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-notes">Notas</Label>
              <Input id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
