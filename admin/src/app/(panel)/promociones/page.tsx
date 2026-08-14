'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Promotion } from '@/types';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
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

type PromoForm = {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_purchase: string;
  start_date: string;
  end_date: string;
};

const emptyForm: PromoForm = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase: '0',
  start_date: '',
  end_date: '',
};

export default function AdminPromocionesPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: () => api<Promotion[]>('/promotions/admin'),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_purchase: Number(form.min_purchase) || 0,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: true,
      };
      if (editing) {
        return api(`/promotions/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return api('/promotions', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'Promoción actualizada' : 'Promoción creada');
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Promoción eliminada');
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setDeleteOpen(false);
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Promociones" description="Ofertas y descuentos del catálogo">
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden />
          Nueva promoción
        </Button>
      </PageHeader>

      <DataTableShell
        title="Listado de promociones"
        isLoading={isLoading}
        actions={<Badge variant="outline">{promotions.length} promociones</Badge>}
      >
        {promotions.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Nombre</TableHead>
                <TableHead scope="col">Descuento</TableHead>
                <TableHead scope="col">Vigencia</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.description ? (
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.discount_type === 'percentage'
                      ? `${p.discount_value}%`
                      : `S/ ${Number(p.discount_value).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.start_date).toLocaleDateString('es-PE')} —{' '}
                    {new Date(p.end_date).toLocaleDateString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active !== false ? 'default' : 'secondary'}>
                      {p.is_active !== false ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => {
                        setEditing(p);
                        setForm({
                          name: p.name,
                          description: p.description ?? '',
                          discount_type: p.discount_type,
                          discount_value: String(p.discount_value),
                          min_purchase: String(p.min_purchase ?? 0),
                          start_date: p.start_date.slice(0, 16),
                          end_date: p.end_date.slice(0, 16),
                        });
                        setDialogOpen(true);
                      }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => { setDeleting(p); setDeleteOpen(true); }}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin promociones registradas.</p>
        )}
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle>
            <DialogDescription>Configura una oferta con vigencia.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim() || !form.discount_value || !form.start_date || !form.end_date) {
                toast.error('Completa los campos obligatorios');
                return;
              }
              saveMutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="promo-name">Nombre</Label>
              <Input id="promo-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-desc">Descripción</Label>
              <Input id="promo-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-type">Tipo</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v as PromoForm['discount_type'] }))}
                >
                  <SelectTrigger id="promo-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-value">Valor</Label>
                <Input id="promo-value" type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-min">Compra mínima (S/)</Label>
              <Input id="promo-min" type="number" min="0" value={form.min_purchase} onChange={(e) => setForm((f) => ({ ...f, min_purchase: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-start">Inicio</Label>
                <Input id="promo-start" type="datetime-local" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-end">Fin</Label>
                <Input id="promo-end" type="datetime-local" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? 'Guardar cambios' : 'Crear promoción'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar promoción"
        description={`¿Eliminar "${deleting?.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }}
      />
    </div>
  );
}
